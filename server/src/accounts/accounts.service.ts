import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { PaymentType } from '@prisma/client'

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  // ── Expenses ──────────────────────────────────────────────────────────────

  async createExpense(dto: any) {
    return this.prisma.expense.create({
      data: {
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : new Date(),
      },
    })
  }

  async findExpenses(page = 1, limit = 50, from?: string, to?: string) {
    const skip = (page - 1) * limit
    const where: any = {}
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from)
      if (to) where.date.lte = new Date(to)
    }
    return this.prisma.$transaction([
      this.prisma.expense.findMany({ where, skip, take: limit, orderBy: { date: 'desc' } }),
      this.prisma.expense.count({ where }),
    ])
  }

  // ── Income ────────────────────────────────────────────────────────────────

  async createIncome(dto: any) {
    return this.prisma.income.create({
      data: {
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : new Date(),
      },
    })
  }

  async findIncome(page = 1, limit = 50, from?: string, to?: string) {
    const skip = (page - 1) * limit
    const where: any = {}
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from)
      if (to) where.date.lte = new Date(to)
    }
    return this.prisma.$transaction([
      this.prisma.income.findMany({ where, skip, take: limit, orderBy: { date: 'desc' } }),
      this.prisma.income.count({ where }),
    ])
  }

  // ── Payments ──────────────────────────────────────────────────────────────

  async createPayment(dto: any) {
    if (!dto.type) throw new BadRequestException('Payment type is required')

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          type: dto.type as PaymentType,
          amount: dto.amount,
          method: dto.method,
          reference: dto.reference,
          notes: dto.notes,
          customerId: dto.customerId,
          supplierId: dto.supplierId,
          saleId: dto.saleId,
          purchaseId: dto.purchaseId,
        },
      })

      if (dto.type === PaymentType.CUSTOMER_RECEIPT && dto.customerId) {
        await tx.customer.update({
          where: { id: dto.customerId },
          data: { outstandingBalance: { decrement: Number(dto.amount) } },
        })
      }

      if (dto.type === PaymentType.SUPPLIER_PAYMENT && dto.supplierId) {
        await tx.supplier.update({
          where: { id: dto.supplierId },
          data: { payableBalance: { decrement: Number(dto.amount) } },
        })
      }

      // TODO: audit log
      return payment
    })
  }

  async findPayments(
    page = 1,
    limit = 50,
    type?: PaymentType,
    customerId?: number,
    supplierId?: number,
  ) {
    const skip = (page - 1) * limit
    const where: any = {}
    if (type) where.type = type
    if (customerId) where.customerId = customerId
    if (supplierId) where.supplierId = supplierId

    return this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: {
          customer: { select: { name: true } },
          supplier: { select: { name: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ])
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  async getSummary(from?: string, to?: string) {
    const dateFilter: any = {}
    if (from || to) {
      if (from) dateFilter.gte = new Date(from)
      if (to) dateFilter.lte = new Date(to)
    }

    const saleWhere: any = { status: 'COMPLETED' }
    const purchaseWhere: any = {}
    const expenseWhere: any = {}
    const incomeWhere: any = {}

    if (Object.keys(dateFilter).length > 0) {
      saleWhere.createdAt = dateFilter
      purchaseWhere.purchaseDate = dateFilter
      expenseWhere.date = dateFilter
      incomeWhere.date = dateFilter
    }

    const [salesAgg, purchasesAgg, expensesAgg, incomeAgg] = await Promise.all([
      this.prisma.sale.aggregate({ where: saleWhere, _sum: { total: true } }),
      this.prisma.purchase.aggregate({ where: purchaseWhere, _sum: { total: true } }),
      this.prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true } }),
      this.prisma.income.aggregate({ where: incomeWhere, _sum: { amount: true } }),
    ])

    const totalSales = Number(salesAgg._sum.total ?? 0)
    const totalPurchases = Number(purchasesAgg._sum.total ?? 0)
    const totalExpenses = Number(expensesAgg._sum.amount ?? 0)
    const totalIncome = Number(incomeAgg._sum.amount ?? 0)
    const grossProfit = totalSales - totalPurchases
    const netProfit = grossProfit - totalExpenses + totalIncome

    return { totalSales, totalPurchases, totalExpenses, totalIncome, grossProfit, netProfit }
  }

  // ── Cash Report ───────────────────────────────────────────────────────────

  async getCashReport(date?: string) {
    const day = date ? new Date(date) : new Date()
    const start = new Date(day)
    start.setHours(0, 0, 0, 0)
    const end = new Date(day)
    end.setHours(23, 59, 59, 999)

    const [salesAgg, paymentsAgg, expensesAgg] = await Promise.all([
      this.prisma.sale.aggregate({
        where: {
          createdAt: { gte: start, lte: end },
          status: 'COMPLETED',
          paymentMethod: 'CASH',
        },
        _sum: { total: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          createdAt: { gte: start, lte: end },
          type: PaymentType.CUSTOMER_RECEIPT,
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ])

    const openingBalance = 0
    const salesCash = Number(salesAgg._sum.total ?? 0)
    const paymentsReceived = Number(paymentsAgg._sum.amount ?? 0)
    const expensesPaid = Number(expensesAgg._sum.amount ?? 0)
    const closingBalance = openingBalance + salesCash + paymentsReceived - expensesPaid

    return {
      date: start.toISOString().slice(0, 10),
      openingBalance,
      salesCash,
      paymentsReceived,
      expensesPaid,
      closingBalance,
    }
  }
}
