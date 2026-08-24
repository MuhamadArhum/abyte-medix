import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: any) {
    return this.prisma.customer.create({ data: dto })
  }

  async findAll(page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit
    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ]
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.customer.count({ where }),
    ])
    return { data, total }
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id } })
    if (!customer) throw new NotFoundException('Customer not found')
    return customer
  }

  async update(id: number, dto: any) {
    await this.findOne(id)
    return this.prisma.customer.update({ where: { id }, data: dto })
  }

  async deactivate(id: number) {
    await this.findOne(id)
    return this.prisma.customer.update({ where: { id }, data: { isActive: false } })
  }

  async getLedger(id: number) {
    await this.findOne(id)

    const [sales, payments, returns] = await Promise.all([
      this.prisma.sale.findMany({
        where: { customerId: id },
        select: { id: true, invoiceNumber: true, total: true, amountPaid: true, paymentMethod: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: { customerId: id },
        select: { id: true, amount: true, method: true, reference: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.saleReturn.findMany({
        where: { customerId: id },
        select: { id: true, refundAmount: true, reason: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    // Merge into a timeline with running balance
    const entries: any[] = [
      ...sales.map((s) => ({
        type: 'SALE',
        date: s.createdAt,
        debit: Number(s.total) - Number(s.amountPaid),
        credit: 0,
        reference: s.invoiceNumber,
        meta: s,
      })),
      ...payments.map((p) => ({
        type: 'PAYMENT',
        date: p.createdAt,
        debit: 0,
        credit: Number(p.amount),
        reference: p.reference ?? '',
        meta: p,
      })),
      ...returns.map((r) => ({
        type: 'SALE_RETURN',
        date: r.createdAt,
        debit: 0,
        credit: Number(r.refundAmount),
        reference: '',
        meta: r,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime())

    let balance = 0
    const ledger = entries.map((e) => {
      balance += e.debit - e.credit
      return { ...e, balance }
    })

    const customer = await this.prisma.customer.findUnique({ where: { id } })
    // Sync stored balance with ledger calculation to prevent drift
    if (Math.abs(Number(customer!.outstandingBalance) - balance) > 0.001) {
      await this.prisma.customer.update({
        where: { id },
        data: { outstandingBalance: balance },
      })
    }
    return { customer: { ...customer!, outstandingBalance: balance }, ledger, closingBalance: balance }
  }

  async creditCheck(id: number, amount: number) {
    const customer = await this.findOne(id)
    const creditLimit = Number(customer.creditLimit)
    const outstanding = Number(customer.outstandingBalance)
    const available = creditLimit - outstanding
    const canExtend = available >= amount

    return {
      customerId: id,
      creditLimit,
      outstandingBalance: outstanding,
      availableCredit: available,
      requestedAmount: amount,
      approved: canExtend,
      message: canExtend
        ? `Credit approved. Available: ${available}`
        : `Insufficient credit. Available: ${available}, Requested: ${amount}`,
    }
  }
}
