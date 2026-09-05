import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { ShiftStatus, SaleStatus } from '@prisma/client'

interface ShiftSaleRow {
  total: any
  paymentMethod: string
  amountPaid: any
}

interface ShiftTotals {
  saleCount: number
  totalSales: number
  cashSales: number
  creditSales: number
  cardSales: number
  splitCash: number
  splitCredit: number
}

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  private calculateShiftTotals(sales: ShiftSaleRow[]): ShiftTotals {
    const sum = (rows: ShiftSaleRow[], fn: (r: ShiftSaleRow) => number) =>
      rows.reduce((s, r) => s + fn(r), 0)

    const byMethod = (m: string) => sales.filter(r => r.paymentMethod === m)

    return {
      saleCount: sales.length,
      totalSales: sum(sales, r => Number(r.total)),
      cashSales: sum(byMethod('CASH'), r => Number(r.total)),
      creditSales: sum(byMethod('CREDIT'), r => Number(r.total)),
      cardSales: sum(byMethod('CARD'), r => Number(r.total)),
      splitCash: sum(byMethod('SPLIT'), r => Number(r.amountPaid)),
      splitCredit: sum(byMethod('SPLIT'), r => Number(r.total) - Number(r.amountPaid)),
    }
  }

  private async fetchShiftSales(shiftId: number): Promise<ShiftSaleRow[]> {
    return this.prisma.sale.findMany({
      where: { shiftId, status: SaleStatus.COMPLETED },
      select: { total: true, paymentMethod: true, amountPaid: true },
    })
  }

  async openShift(userId: number, openingBalance = 0) {
    // Use a transaction to prevent race condition when two terminals open shifts simultaneously
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.shift.findFirst({ where: { status: 'OPEN' } })
      if (existing) throw new BadRequestException('A shift is already open. Close it before opening a new one.')

      return tx.shift.create({
        data: { openedById: userId, openingBalance, status: ShiftStatus.OPEN },
        include: { openedBy: { select: { fullName: true } } },
      })
    })
  }

  async getCurrentShift() {
    const shift = await this.prisma.shift.findFirst({
      where: { status: ShiftStatus.OPEN },
      orderBy: { openedAt: 'desc' },
      include: { openedBy: { select: { fullName: true } } },
    })
    if (!shift) return null

    const sales = await this.fetchShiftSales(shift.id)
    return { ...shift, ...this.calculateShiftTotals(sales) }
  }

  async closeShift(id: number, userId: number, closingBalance?: number, notes?: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id } })
    if (!shift) throw new NotFoundException('Shift not found')
    if (shift.status !== ShiftStatus.OPEN) throw new BadRequestException('Shift is already closed')

    const sales = await this.fetchShiftSales(id)
    const totals = this.calculateShiftTotals(sales)

    const closed = await this.prisma.shift.update({
      where: { id },
      data: {
        status: ShiftStatus.CLOSED,
        closedAt: new Date(),
        closedById: userId,
        closingBalance: closingBalance ?? undefined,
        notes: notes ?? undefined,
      },
      include: {
        openedBy: { select: { fullName: true } },
        closedBy: { select: { fullName: true } },
      },
    })

    return { ...closed, ...totals }
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [data, total] = await this.prisma.$transaction([
      this.prisma.shift.findMany({
        skip, take: limit,
        orderBy: { openedAt: 'desc' },
        include: {
          openedBy: { select: { fullName: true } },
          closedBy: { select: { fullName: true } },
          _count: { select: { sales: true } },
        },
      }),
      this.prisma.shift.count(),
    ])
    return { data, total }
  }

  async getShiftSummary(id: number) {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      include: {
        openedBy: { select: { fullName: true } },
        closedBy: { select: { fullName: true } },
      },
    })
    if (!shift) throw new NotFoundException('Shift not found')

    const sales = await this.prisma.sale.findMany({
      where: { shiftId: id, status: 'COMPLETED' },
      select: { total: true, paymentMethod: true, amountPaid: true, invoiceNumber: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    return { shift, ...this.calculateShiftTotals(sales), sales }
  }
}
