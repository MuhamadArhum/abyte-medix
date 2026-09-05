import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private dateRange(from?: string, to?: string) {
    const range: any = {}
    if (from) range.gte = new Date(from)
    if (to) {
      const toDate = new Date(to)
      toDate.setHours(23, 59, 59, 999)
      range.lte = toDate
    }
    return Object.keys(range).length ? range : undefined
  }

  // ── Sales Reports ──────────────────────────────────────────────────────────

  async salesByPeriod(from?: string, to?: string, groupBy: 'day' | 'month' = 'day') {
    const where: any = { status: 'COMPLETED' }
    const dr = this.dateRange(from, to)
    if (dr) where.createdAt = dr

    const sales = await this.prisma.sale.findMany({
      where,
      select: { createdAt: true, total: true, discountAmount: true, taxAmount: true },
      orderBy: { createdAt: 'asc' },
    })

    const grouped = new Map<string, { total: number; count: number; discount: number }>()
    for (const s of sales) {
      const key =
        groupBy === 'day'
          ? s.createdAt.toISOString().slice(0, 10)
          : s.createdAt.toISOString().slice(0, 7)
      const existing = grouped.get(key) ?? { total: 0, count: 0, discount: 0 }
      grouped.set(key, {
        total: existing.total + Number(s.total),
        count: existing.count + 1,
        discount: existing.discount + Number(s.discountAmount),
      })
    }

    return Array.from(grouped.entries()).map(([period, data]) => ({ period, ...data }))
  }

  async salesByProduct(from?: string, to?: string) {
    const dr = this.dateRange(from, to)
    const saleWhere: any = { sale: { status: 'COMPLETED' } }
    if (dr) saleWhere.sale = { ...saleWhere.sale, createdAt: dr }

    const items = await this.prisma.saleItem.findMany({
      where: saleWhere,
      include: {
        batch: {
          include: { medicine: { select: { id: true, brandName: true, genericName: true } } },
        },
      },
    })

    const map = new Map<number, { medicineId: number; brandName: string; totalQty: number; totalRevenue: number }>()
    for (const item of items) {
      const med = item.batch.medicine
      const existing = map.get(med.id) ?? { medicineId: med.id, brandName: med.brandName, totalQty: 0, totalRevenue: 0 }
      map.set(med.id, {
        ...existing,
        totalQty: existing.totalQty + item.quantity,
        totalRevenue: existing.totalRevenue + Number(item.total),
      })
    }

    return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)
  }

  async salesByCustomer(from?: string, to?: string) {
    const where: any = { status: 'COMPLETED', customerId: { not: null } }
    const dr = this.dateRange(from, to)
    if (dr) where.createdAt = dr

    const sales = await this.prisma.sale.findMany({
      where,
      include: { customer: { select: { id: true, name: true } } },
    })

    const map = new Map<number, { customerId: number; name: string; totalSales: number; count: number }>()
    for (const s of sales) {
      if (!s.customer) continue
      const existing = map.get(s.customer.id) ?? { customerId: s.customer.id, name: s.customer.name, totalSales: 0, count: 0 }
      map.set(s.customer.id, {
        ...existing,
        totalSales: existing.totalSales + Number(s.total),
        count: existing.count + 1,
      })
    }

    return Array.from(map.values()).sort((a, b) => b.totalSales - a.totalSales)
  }

  // ── Purchase Reports ───────────────────────────────────────────────────────

  async purchasesByPeriod(from?: string, to?: string, groupBy: 'day' | 'month' = 'day') {
    const where: any = {}
    const dr = this.dateRange(from, to)
    if (dr) where.purchaseDate = dr

    const purchases = await this.prisma.purchase.findMany({
      where,
      select: { purchaseDate: true, total: true },
      orderBy: { purchaseDate: 'asc' },
    })

    const grouped = new Map<string, { total: number; count: number }>()
    for (const p of purchases) {
      const key =
        groupBy === 'day'
          ? p.purchaseDate.toISOString().slice(0, 10)
          : p.purchaseDate.toISOString().slice(0, 7)
      const existing = grouped.get(key) ?? { total: 0, count: 0 }
      grouped.set(key, { total: existing.total + Number(p.total), count: existing.count + 1 })
    }

    return Array.from(grouped.entries()).map(([period, data]) => ({ period, ...data }))
  }

  async purchasesBySupplier(from?: string, to?: string) {
    const where: any = {}
    const dr = this.dateRange(from, to)
    if (dr) where.purchaseDate = dr

    const purchases = await this.prisma.purchase.findMany({
      where,
      include: { supplier: { select: { id: true, name: true } } },
    })

    const map = new Map<number, { supplierId: number; name: string; totalPurchases: number; count: number }>()
    for (const p of purchases) {
      const existing = map.get(p.supplierId) ?? {
        supplierId: p.supplierId,
        name: p.supplier.name,
        totalPurchases: 0,
        count: 0,
      }
      map.set(p.supplierId, {
        ...existing,
        totalPurchases: existing.totalPurchases + Number(p.total),
        count: existing.count + 1,
      })
    }

    return Array.from(map.values()).sort((a, b) => b.totalPurchases - a.totalPurchases)
  }

  // ── Inventory Reports ──────────────────────────────────────────────────────

  async inventoryValuation() {
    const medicines = await this.prisma.medicine.findMany({
      where: { isActive: true },
      include: {
        batches: {
          select: { quantity: true, purchaseRate: true, saleRate: true },
        },
      },
      orderBy: { brandName: 'asc' },
    })

    return medicines.map((m) => {
      const totalQty = m.batches.reduce((sum, b) => sum + b.quantity, 0)
      const costValue = m.batches.reduce((sum, b) => sum + b.quantity * Number(b.purchaseRate), 0)
      const saleValue = m.batches.reduce((sum, b) => sum + b.quantity * Number(b.saleRate), 0)
      return {
        medicineId: m.id,
        brandName: m.brandName,
        totalQty,
        costValue: Math.round(costValue * 100) / 100,
        saleValue: Math.round(saleValue * 100) / 100,
      }
    })
  }

  async inventoryMovements(from?: string, to?: string, type?: string) {
    const where: any = {}
    const dr = this.dateRange(from, to)
    if (dr) where.createdAt = dr
    if (type) where.type = type

    return this.prisma.stockMovement.findMany({
      where,
      include: {
        batch: {
          include: { medicine: { select: { brandName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // ── Profit & Loss ──────────────────────────────────────────────────────────

  async profitLoss(from?: string, to?: string) {
    const dr = this.dateRange(from, to)

    const saleWhere: any = { status: 'COMPLETED' }
    if (dr) saleWhere.createdAt = dr

    const sales = await this.prisma.sale.findMany({
      where: saleWhere,
      select: {
        total: true,
        items: {
          select: {
            quantity: true,
            total: true,
            batch: { select: { purchaseRate: true } },
          },
        },
      },
    })

    const returnWhere: any = {}
    if (dr) returnWhere.createdAt = dr
    const saleReturnsAgg = await this.prisma.saleReturn.aggregate({
      where: returnWhere,
      _sum: { refundAmount: true },
    })
    const saleReturnsTotal = Number(saleReturnsAgg._sum.refundAmount ?? 0)

    let revenue = 0
    let cogs = 0
    for (const s of sales) {
      revenue += Number(s.total)
      for (const item of s.items) {
        cogs += item.quantity * Number(item.batch.purchaseRate ?? 0)
      }
    }
    revenue -= saleReturnsTotal

    const grossProfit = revenue - cogs
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0

    const expWhere: any = {}
    if (dr) expWhere.date = dr
    const expAgg = await this.prisma.expense.aggregate({
      where: expWhere,
      _sum: { amount: true },
    })
    const totalExpenses = Number(expAgg._sum.amount ?? 0)

    const incWhere: any = {}
    if (dr) incWhere.date = dr
    const incAgg = await this.prisma.income.aggregate({
      where: incWhere,
      _sum: { amount: true },
    })
    const otherIncome = Number(incAgg._sum.amount ?? 0)

    const netProfit = grossProfit - totalExpenses + otherIncome

    const r = (n: number) => Math.round(n * 100) / 100

    return {
      period: { from: from ?? null, to: to ?? null },
      grossRevenue: r(revenue + saleReturnsTotal),
      saleReturns: r(saleReturnsTotal),
      revenue: r(revenue),
      cogs: r(cogs),
      grossProfit: r(grossProfit),
      grossMargin: r(grossMargin),
      expenses: r(totalExpenses),
      otherIncome: r(otherIncome),
      netProfit: r(netProfit),
      salesCount: sales.length,
    }
  }
}
