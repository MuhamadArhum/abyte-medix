import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PaymentType } from '@prisma/client'

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: any) {
    return this.prisma.supplier.create({ data: dto })
  }

  async findAll(page = 1, limit = 50, search?: string, isActive?: boolean, hasPayable?: boolean) {
    const skip = (page - 1) * limit
    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ]
    }
    if (isActive !== undefined) where.isActive = isActive
    if (hasPayable === true) where.payableBalance = { gt: 0 }
    if (hasPayable === false) where.payableBalance = { lte: 0 }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.supplier.count({ where }),
    ])
    return { data, total }
  }

  async findOne(id: number) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } })
    if (!supplier) throw new NotFoundException('Supplier not found')
    return supplier
  }

  async update(id: number, dto: any) {
    await this.findOne(id)
    return this.prisma.supplier.update({ where: { id }, data: dto })
  }

  async deactivate(id: number) {
    await this.findOne(id)
    return this.prisma.supplier.update({ where: { id }, data: { isActive: false } })
  }

  async reactivate(id: number) {
    await this.findOne(id)
    return this.prisma.supplier.update({ where: { id }, data: { isActive: true } })
  }

  async makePayment(supplierId: number, dto: { amount: number; method?: string; reference?: string; notes?: string }) {
    const supplier = await this.findOne(supplierId)
    if (Number(dto.amount) <= 0) throw new BadRequestException('Amount must be positive')
    if (Number(dto.amount) > Number(supplier.payableBalance)) {
      throw new BadRequestException(`Payment exceeds payable balance (Rs. ${Number(supplier.payableBalance).toFixed(2)})`)
    }
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          type: PaymentType.SUPPLIER_PAYMENT,
          amount: dto.amount,
          method: dto.method ?? 'CASH',
          reference: dto.reference,
          notes: dto.notes,
          supplierId,
        },
      })
      await tx.supplier.update({
        where: { id: supplierId },
        data: { payableBalance: { decrement: Number(dto.amount) } },
      })
      return payment
    })
  }

  async getLedger(id: number) {
    await this.findOne(id)

    const [purchases, payments, returns] = await Promise.all([
      this.prisma.purchase.findMany({
        where: { supplierId: id },
        select: { id: true, invoiceNumber: true, total: true, amountPaid: true, purchaseDate: true },
        orderBy: { purchaseDate: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: { supplierId: id },
        select: { id: true, amount: true, method: true, reference: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.purchaseReturn.findMany({
        where: { supplierId: id },
        select: { id: true, totalAmount: true, reason: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    const entries: any[] = [
      ...purchases.map((p) => ({
        type: 'PURCHASE',
        date: p.purchaseDate,
        debit: 0,
        credit: Number(p.total) - Number(p.amountPaid),
        reference: p.invoiceNumber,
        meta: p,
      })),
      ...payments.map((p) => ({
        type: 'PAYMENT',
        date: p.createdAt,
        debit: Number(p.amount),
        credit: 0,
        reference: p.reference ?? '',
        meta: p,
      })),
      ...returns.map((r) => ({
        type: 'PURCHASE_RETURN',
        date: r.createdAt,
        debit: Number(r.totalAmount),
        credit: 0,
        reference: '',
        meta: r,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime())

    let balance = 0
    const ledger = entries.map((e) => {
      balance += e.credit - e.debit
      return { ...e, balance }
    })

    const supplier = await this.prisma.supplier.findUnique({ where: { id } })
    // Sync stored balance with ledger calculation to prevent drift
    if (Math.abs(Number(supplier!.payableBalance) - balance) > 0.001) {
      await this.prisma.supplier.update({
        where: { id },
        data: { payableBalance: balance },
      })
    }
    return { supplier: { ...supplier!, payableBalance: balance }, ledger, closingBalance: balance }
  }
}
