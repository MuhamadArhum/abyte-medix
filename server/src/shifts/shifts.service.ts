import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async openShift(userId: number, openingBalance = 0) {
    const existing = await this.prisma.shift.findFirst({ where: { status: 'OPEN' } })
    if (existing) throw new BadRequestException('A shift is already open. Close it before opening a new one.')

    return this.prisma.shift.create({
      data: { openedById: userId, openingBalance, status: 'OPEN' },
      include: { openedBy: { select: { fullName: true } } },
    })
  }

  async getCurrentShift() {
    const shift = await this.prisma.shift.findFirst({
      where: { status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
      include: { openedBy: { select: { fullName: true } } },
    })
    if (!shift) return null

    // Calculate live totals from sales in this shift
    const sales = await this.prisma.sale.findMany({
      where: { shiftId: shift.id, status: 'COMPLETED' },
      select: { total: true, paymentMethod: true, amountPaid: true },
    })

    const totalSales = sales.reduce((s, r) => s + Number(r.total), 0)
    const cashSales = sales.filter(r => r.paymentMethod === 'CASH').reduce((s, r) => s + Number(r.total), 0)
    const creditSales = sales.filter(r => r.paymentMethod === 'CREDIT').reduce((s, r) => s + Number(r.total), 0)
    const cardSales = sales.filter(r => r.paymentMethod === 'CARD').reduce((s, r) => s + Number(r.total), 0)
    const splitCash = sales.filter(r => r.paymentMethod === 'SPLIT').reduce((s, r) => s + Number(r.amountPaid), 0)
    const splitCredit = sales.filter(r => r.paymentMethod === 'SPLIT').reduce((s, r) => s + (Number(r.total) - Number(r.amountPaid)), 0)

    return {
      ...shift,
      saleCount: sales.length,
      totalSales,
      cashSales,
      creditSales,
      cardSales,
      splitCash,
      splitCredit,
    }
  }

  async closeShift(id: number, userId: number, closingBalance?: number, notes?: string) {
    const shift = await this.prisma.shift.findUnique({ where: { id } })
    if (!shift) throw new NotFoundException('Shift not found')
    if (shift.status !== 'OPEN') throw new BadRequestException('Shift is already closed')

    // Calculate final totals
    const sales = await this.prisma.sale.findMany({
      where: { shiftId: id, status: 'COMPLETED' },
      select: { total: true, paymentMethod: true, amountPaid: true },
    })

    const totalSales = sales.reduce((s, r) => s + Number(r.total), 0)
    const cashSales = sales.filter(r => r.paymentMethod === 'CASH').reduce((s, r) => s + Number(r.total), 0)
    const creditSales = sales.filter(r => r.paymentMethod === 'CREDIT').reduce((s, r) => s + Number(r.total), 0)
    const splitCash = sales.filter(r => r.paymentMethod === 'SPLIT').reduce((s, r) => s + Number(r.amountPaid), 0)

    const closed = await this.prisma.shift.update({
      where: { id },
      data: {
        status: 'CLOSED',
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

    return {
      ...closed,
      saleCount: sales.length,
      totalSales,
      cashSales,
      creditSales,
      splitCash,
    }
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
      select: { total: true, paymentMethod: true, invoiceNumber: true, createdAt: true, amountPaid: true },
      orderBy: { createdAt: 'asc' },
    })

    const totalSales = sales.reduce((s, r) => s + Number(r.total), 0)
    const cashSales = sales.filter(r => r.paymentMethod === 'CASH').reduce((s, r) => s + Number(r.total), 0)
    const creditSales = sales.filter(r => r.paymentMethod === 'CREDIT').reduce((s, r) => s + Number(r.total), 0)
    const cardSales = sales.filter(r => r.paymentMethod === 'CARD').reduce((s, r) => s + Number(r.total), 0)

    return {
      shift,
      saleCount: sales.length,
      totalSales,
      cashSales,
      creditSales,
      cardSales,
      sales,
    }
  }
}
