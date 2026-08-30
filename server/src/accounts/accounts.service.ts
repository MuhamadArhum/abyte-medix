import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { PaymentType } from '@prisma/client'

@Injectable()
export class AccountsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ── Expenses ──────────────────────────────────────────────────────────────

  async createExpense(dto: any, userId?: number) {
    const expense = await this.prisma.expense.create({
      data: {
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : new Date(),
      },
    })
    await this.audit.log({
      userId,
      module: 'Accounts',
      action: 'CREATE_EXPENSE',
      recordId: expense.id,
      newValue: { category: expense.category, amount: Number(expense.amount), date: expense.date },
    })
    return expense
  }

  async findExpenses(page = 1, limit = 50, from?: string, to?: string) {
    const skip = (page - 1) * limit
    const where: any = {}
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from)
      if (to) { const d = new Date(to); d.setHours(23, 59, 59, 999); where.date.lte = d }
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({ where, skip, take: limit, orderBy: { date: 'desc' } }),
      this.prisma.expense.count({ where }),
    ])
    return { data, total }
  }

  // ── Income ────────────────────────────────────────────────────────────────

  async createIncome(dto: any, userId?: number) {
    const income = await this.prisma.income.create({
      data: {
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : new Date(),
      },
    })
    await this.audit.log({
      userId,
      module: 'Accounts',
      action: 'CREATE_INCOME',
      recordId: income.id,
      newValue: { category: income.category, amount: Number(income.amount), date: income.date },
    })
    return income
  }

  async findIncome(page = 1, limit = 50, from?: string, to?: string) {
    const skip = (page - 1) * limit
    const where: any = {}
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from)
      if (to) { const d = new Date(to); d.setHours(23, 59, 59, 999); where.date.lte = d }
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.income.findMany({ where, skip, take: limit, orderBy: { date: 'desc' } }),
      this.prisma.income.count({ where }),
    ])
    return { data, total }
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

      await this.audit.log({
        userId: dto.userId,
        module: 'Accounts',
        action: 'CREATE_PAYMENT',
        recordId: payment.id,
        newValue: {
          type: payment.type,
          amount: Number(payment.amount),
          method: payment.method,
          customerId: payment.customerId,
          supplierId: payment.supplierId,
        },
      })
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

    const [data, total] = await this.prisma.$transaction([
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
    return { data, total }
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  async getSummary(from?: string, to?: string) {
    const dateFilter: any = {}
    if (from) dateFilter.gte = new Date(from)
    if (to) { const d = new Date(to); d.setHours(23, 59, 59, 999); dateFilter.lte = d }

    const saleWhere: any = { status: 'COMPLETED' }
    const purchaseWhere: any = {}
    const expenseWhere: any = {}
    const incomeWhere: any = {}
    const paymentWhere: any = {}

    if (Object.keys(dateFilter).length > 0) {
      saleWhere.createdAt = dateFilter
      purchaseWhere.purchaseDate = dateFilter
      expenseWhere.date = dateFilter
      incomeWhere.date = dateFilter
      paymentWhere.createdAt = dateFilter
    }

    const [salesAgg, discountAgg, taxAgg, cashSalesAgg, purchasesAgg, expensesAgg, incomeAgg, custReceiptsAgg, supplierPaymentsAgg] = await Promise.all([
      this.prisma.sale.aggregate({ where: saleWhere, _sum: { total: true } }),
      this.prisma.sale.aggregate({ where: saleWhere, _sum: { discountAmount: true } }),
      this.prisma.sale.aggregate({ where: saleWhere, _sum: { taxAmount: true } }),
      this.prisma.sale.aggregate({ where: { ...saleWhere, paymentMethod: 'CASH' }, _sum: { total: true } }),
      this.prisma.purchase.aggregate({ where: purchaseWhere, _sum: { total: true } }),
      this.prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true } }),
      this.prisma.income.aggregate({ where: incomeWhere, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { ...paymentWhere, type: PaymentType.CUSTOMER_RECEIPT }, _sum: { amount: true } }),
      this.prisma.payment.aggregate({ where: { ...paymentWhere, type: PaymentType.SUPPLIER_PAYMENT }, _sum: { amount: true } }),
    ])

    const totalSales = Number(salesAgg._sum.total ?? 0)
    const totalPurchases = Number(purchasesAgg._sum.total ?? 0)
    const totalExpenses = Number(expensesAgg._sum.amount ?? 0)
    const totalIncome = Number(incomeAgg._sum.amount ?? 0)
    const grossProfit = totalSales - totalPurchases
    const netProfit = grossProfit - totalExpenses + totalIncome

    const totalDiscount = Number(discountAgg._sum.discountAmount ?? 0)
    const totalTax = Number(taxAgg._sum.taxAmount ?? 0)
    const cashIn = Number(cashSalesAgg._sum.total ?? 0) + Number(custReceiptsAgg._sum.amount ?? 0)
    const cashOut = totalExpenses + Number(supplierPaymentsAgg._sum.amount ?? 0)

    const r = (n: number) => Math.round(n * 100) / 100
    return {
      totalSales: r(totalSales),
      totalPurchases: r(totalPurchases),
      totalExpenses: r(totalExpenses),
      totalIncome: r(totalIncome),
      grossProfit: r(grossProfit),
      netProfit: r(netProfit),
      totalDiscount: r(totalDiscount),
      totalTax: r(totalTax),
      cashIn: r(cashIn),
      cashOut: r(cashOut),
    }
  }

  // ── Categories ───────────────────────────────────────────────────────────

  async getExpenseCategories() {
    const rows = await this.prisma.expense.findMany({ select: { category: true }, distinct: ['category'], orderBy: { category: 'asc' } })
    return rows.map(r => r.category).filter(Boolean)
  }

  async getIncomeCategories() {
    const rows = await this.prisma.income.findMany({ select: { category: true }, distinct: ['category'], orderBy: { category: 'asc' } })
    return rows.map(r => r.category).filter(Boolean)
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
    const cashIn = salesCash + paymentsReceived
    const cashOut = expensesPaid
    const closingBalance = openingBalance + cashIn - cashOut

    return {
      date: start.toISOString().slice(0, 10),
      openingBalance,
      salesCash,
      paymentsReceived,
      expensesPaid,
      cashIn,
      cashOut,
      closingBalance,
    }
  }
}
