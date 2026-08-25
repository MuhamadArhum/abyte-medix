import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class MedicinesService {
  constructor(private prisma: PrismaService) {}

  async search(query: string, limit = 20) {
    return this.prisma.medicine.findMany({
      where: {
        isActive: true,
        OR: [
          { barcode: { contains: query } },
          { brandName: { contains: query } },
          { genericName: { contains: query } },
          { productCode: { contains: query } },
        ],
      },
      include: {
        category: true,
        manufacturer: true,
        batches: {
          where: { quantity: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
        },
      },
      take: limit,
    })
  }

  async findAll(
    page = 1,
    limit = 50,
    search?: string,
    categoryId?: number,
    manufacturerId?: number,
    prescriptionRequired?: boolean,
    isActive?: boolean,
  ) {
    const skip = (page - 1) * limit
    const where: any = { isActive: isActive ?? true }

    if (search) {
      where.OR = [
        { brandName: { contains: search } },
        { genericName: { contains: search } },
        { barcode: { contains: search } },
        { productCode: { contains: search } },
      ]
    }
    if (categoryId) where.categoryId = categoryId
    if (manufacturerId) where.manufacturerId = manufacturerId
    if (prescriptionRequired !== undefined) where.prescriptionRequired = prescriptionRequired

    const [medicines, total] = await this.prisma.$transaction([
      this.prisma.medicine.findMany({
        where,
        include: {
          category: true,
          manufacturer: true,
          batches: { select: { quantity: true } },
        },
        skip,
        take: limit,
        orderBy: { brandName: 'asc' },
      }),
      this.prisma.medicine.count({ where }),
    ])
    const data = medicines.map(({ batches, ...m }) => ({
      ...m,
      totalQty: batches.reduce((sum, b) => sum + b.quantity, 0),
    }))
    return { data, total }
  }

  async findOne(id: number) {
    const med = await this.prisma.medicine.findUnique({
      where: { id },
      include: {
        category: true,
        manufacturer: true,
        batches: { orderBy: { expiryDate: 'asc' } },
      },
    })
    if (!med) throw new NotFoundException('Medicine not found')
    return med
  }

  async create(dto: any) {
    if (dto.productCode) {
      const exists = await this.prisma.medicine.findUnique({ where: { productCode: dto.productCode } })
      if (exists) throw new ConflictException('Product code already exists')
    }
    return this.prisma.medicine.create({ data: dto })
  }

  async update(id: number, dto: any) {
    await this.findOne(id)
    return this.prisma.medicine.update({ where: { id }, data: dto })
  }

  async deactivate(id: number) {
    await this.findOne(id)
    const hasTx = await this.prisma.saleItem.count({
      where: { batch: { medicineId: id } },
    })
    if (hasTx === 0) {
      return this.prisma.medicine.delete({ where: { id } })
    }
    return this.prisma.medicine.update({ where: { id }, data: { isActive: false } })
  }

  getLowStock() {
    return this.prisma.$queryRaw`
      SELECT m.id, m.brandName, m.genericName, m.reorderLevel,
             COALESCE(SUM(b.quantity), 0) as totalQty
      FROM Medicine m
      LEFT JOIN Batch b ON b.medicineId = m.id
      WHERE m.isActive = 1
      GROUP BY m.id, m.brandName, m.genericName, m.reorderLevel
      HAVING totalQty <= m.reorderLevel AND m.reorderLevel > 0
      ORDER BY totalQty ASC
    `
  }

  getExpiringBatches(days: number) {
    const threshold = new Date()
    threshold.setDate(threshold.getDate() + days)
    return this.prisma.batch.findMany({
      where: {
        expiryDate: { lte: threshold },
        quantity: { gt: 0 },
      },
      include: { medicine: true },
      orderBy: { expiryDate: 'asc' },
    })
  }
}
