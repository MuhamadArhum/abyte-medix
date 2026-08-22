import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  async getDashboard(role: string) {
    const today = new Date()
    const startOfDay = new Date(today)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(today)
    endOfDay.setHours(23, 59, 59, 999)

    const expiryDaysStr = await this.settings.get('expiry_alert_days', '90')
    const expiryAlertDays = parseInt(expiryDaysStr ?? '90', 10)
    const expiryAlertDate = new Date()
    expiryAlertDate.setDate(expiryAlertDate.getDate() + expiryAlertDays)

    const lowStockThresholdStr = await this.settings.get('low_stock_threshold', '10')
    const lowStockThreshold = parseInt(lowStockThresholdStr ?? '10', 10)

    const [
      salesAgg,
      purchasesAgg,
      batches,
      expiringBatches,
      expiredBatches,
      customerReceivables,
      supplierPayables,
      lastBackup,
    ] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { createdAt: { gte: startOfDay, lte: endOfDay }, status: 'COMPLETED' },
        _sum: { total: true, discountAmount: true },
        _count: { id: true },
      }),
      this.prisma.purchase.aggregate({
        where: { purchaseDate: { gte: startOfDay, lte: endOfDay } },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.batch.findMany({
        select: { quantity: true, purchaseRate: true, saleRate: true },
        where: { quantity: { gt: 0 } },
      }),
      this.prisma.batch.count({
        where: {
          quantity: { gt: 0 },
          expiryDate: { lte: expiryAlertDate, gt: today },
        },
      }),
      this.prisma.batch.count({
        where: { quantity: { gt: 0 }, expiryDate: { lt: today } },
      }),
      this.prisma.customer.aggregate({ _sum: { outstandingBalance: true } }),
      this.prisma.supplier.aggregate({ _sum: { payableBalance: true } }),
      this.prisma.backup.findFirst({ orderBy: { createdAt: 'desc' } }),
    ])

    // Low stock: count medicines where total qty across batches < threshold
    const medicinesWithStock = await this.prisma.medicine.findMany({
      where: { isActive: true },
      include: { batches: { select: { quantity: true } } },
    })
    const lowStockCount = medicinesWithStock.filter(
      (m) => m.batches.reduce((sum, b) => sum + b.quantity, 0) <= lowStockThreshold,
    ).length

    const atCost = batches.reduce((sum, b) => sum + b.quantity * Number(b.purchaseRate), 0)
    const atSalePrice = batches.reduce((sum, b) => sum + b.quantity * Number(b.saleRate), 0)

    const base = {
      todaySales: {
        total: Number(salesAgg._sum.total ?? 0),
        count: salesAgg._count.id,
        discountTotal: Number(salesAgg._sum.discountAmount ?? 0),
      },
      todayPurchases: {
        total: Number(purchasesAgg._sum.total ?? 0),
        count: purchasesAgg._count.id,
      },
      lowStockCount,
      expiringCount: expiringBatches,
      expiredCount: expiredBatches,
      lastBackup: lastBackup
        ? { filename: lastBackup.filename, status: lastBackup.status, createdAt: lastBackup.createdAt }
        : null,
    }

    // Sensitive fields — only for ADMIN and MANAGER
    if (role === 'ADMIN' || role === 'MANAGER') {
      return {
        ...base,
        stockValue: {
          atCost: Math.round(atCost * 100) / 100,
          atSalePrice: Math.round(atSalePrice * 100) / 100,
        },
        customerReceivables: Number(customerReceivables._sum.outstandingBalance ?? 0),
        supplierPayables: Number(supplierPayables._sum.payableBalance ?? 0),
      }
    }

    return base
  }
}
