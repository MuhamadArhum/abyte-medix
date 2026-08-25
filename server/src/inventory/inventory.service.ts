import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { MovementType } from '@prisma/client'

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async getStock(
    page = 1,
    limit = 25,
    search = '',
    filter = '',
    expiryDays = 90,
    categoryId?: number,
    manufacturerId?: number,
    sort = 'name_asc',
  ) {
    const where: any = { isActive: true }

    if (search) {
      where.OR = [
        { brandName: { contains: search } },
        { genericName: { contains: search } },
        { productCode: { contains: search } },
      ]
    }
    if (categoryId) where.categoryId = categoryId
    if (manufacturerId) where.manufacturerId = manufacturerId

    const batchSelect = {
      id: true, batchNumber: true, expiryDate: true,
      purchaseRate: true, saleRate: true, quantity: true, freeQuantity: true,
    }

    const dbOrderBy: any = sort === 'name_desc' ? { brandName: 'desc' } : { brandName: 'asc' }

    const toRow = (m: any) => ({
      id: m.id, medicineId: m.id,
      brandName: m.brandName, genericName: m.genericName, strength: m.strength,
      reorderLevel: m.reorderLevel ?? 10,
      category: m.category?.name ?? null, manufacturer: m.manufacturer?.name ?? null,
      totalQty: m.batches.reduce((s: number, b: any) => s + b.quantity, 0),
      batches: m.batches.map((b: any) => ({ ...b, currentQty: b.quantity })),
    })

    const applySort = (rows: ReturnType<typeof toRow>[]) => {
      if (sort === 'qty_asc') return rows.sort((a, b) => a.totalQty - b.totalQty)
      if (sort === 'qty_desc') return rows.sort((a, b) => b.totalQty - a.totalQty)
      return rows
    }

    // Filters that require in-memory aggregation
    if (filter === 'low' || filter === 'out' || filter === 'expiring') {
      const all = await this.prisma.medicine.findMany({
        where,
        include: {
          batches: { select: batchSelect },
          category: { select: { name: true } },
          manufacturer: { select: { name: true } },
        },
        orderBy: dbOrderBy,
      })

      const mapped = all.map(toRow)

      const expiryThreshold = new Date()
      expiryThreshold.setDate(expiryThreshold.getDate() + expiryDays)

      let filtered = filter === 'out'
        ? mapped.filter(m => m.totalQty === 0)
        : filter === 'expiring'
          ? mapped.filter(m => m.batches.some((b: any) => b.expiryDate && new Date(b.expiryDate) <= expiryThreshold && b.quantity > 0))
          : mapped.filter(m => m.totalQty > 0 && m.totalQty <= m.reorderLevel)

      filtered = applySort(filtered)

      const total = filtered.length
      const data = filtered.slice((page - 1) * limit, page * limit)
      return { data, total, page, limit }
    }

    const skip = (page - 1) * limit
    const [medicines, total] = await this.prisma.$transaction([
      this.prisma.medicine.findMany({
        where,
        include: {
          batches: { select: batchSelect },
          category: { select: { name: true } },
          manufacturer: { select: { name: true } },
        },
        orderBy: dbOrderBy,
        skip,
        take: limit,
      }),
      this.prisma.medicine.count({ where }),
    ])

    const data = applySort(medicines.map(toRow))
    return { data, total, page, limit }
  }

  async getMovements(
    page = 1,
    limit = 50,
    batchId?: number,
    medicineId?: number,
    type?: MovementType,
    from?: string,
    to?: string,
  ) {
    const skip = (page - 1) * limit
    const where: any = {}
    if (batchId) where.batchId = batchId
    if (type) where.type = type
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) {
        const toDate = new Date(to)
        toDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = toDate
      }
    }
    if (medicineId) {
      where.batch = { medicineId }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          batch: {
            include: { medicine: { select: { brandName: true, genericName: true } } },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockMovement.count({ where }),
    ])
    return { data, total }
  }

  async adjustment(dto: {
    batchId: number
    type: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE' | 'EXPIRY_WRITEOFF'
    quantity: number
    reason: string
  }) {
    const allowed: string[] = ['ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'EXPIRY_WRITEOFF']
    if (!allowed.includes(dto.type)) {
      throw new BadRequestException(`Invalid adjustment type: ${dto.type}`)
    }

    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({ where: { id: dto.batchId } })
      if (!batch) throw new BadRequestException(`Batch ${dto.batchId} not found`)

      const isDecrease = dto.type !== 'ADJUSTMENT_IN'
      if (isDecrease && batch.quantity < dto.quantity) {
        throw new BadRequestException('Insufficient stock for this adjustment')
      }

      await tx.batch.update({
        where: { id: dto.batchId },
        data: {
          quantity: isDecrease
            ? { decrement: dto.quantity }
            : { increment: dto.quantity },
        },
      })

      const movement = await tx.stockMovement.create({
        data: {
          batchId: dto.batchId,
          type: dto.type as MovementType,
          quantity: isDecrease ? -dto.quantity : dto.quantity,
          reason: dto.reason,
        },
      })

      await this.audit.log({
        module: 'Inventory',
        action: 'STOCK_ADJUSTMENT',
        recordId: dto.batchId,
        newValue: { type: dto.type, quantity: dto.quantity, reason: dto.reason },
      })
      return movement
    })
  }

  async getBatchesByMedicine(medicineId: number) {
    return this.prisma.batch.findMany({
      where: { medicineId },
      include: { medicine: { select: { brandName: true } } },
      orderBy: { expiryDate: 'asc' },
    })
  }
}
