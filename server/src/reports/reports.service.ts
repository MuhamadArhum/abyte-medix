import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private dateRange(from?: string, to?: string) {
    const range: any = {}
    if (from) range.gte = new Date(from)
    if (to) range.lte = new Date(to)
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
}
