import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { MovementType, PurchaseStatus } from '@prisma/client'

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  private async generateInvoiceNumber(): Promise<string> {
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    const count = await this.prisma.purchase.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    })
    return `PUR-${dateStr}-${String(count + 1).padStart(4, '0')}`
  }

  async create(dto: any) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } })
    if (!supplier) throw new NotFoundException('Supplier not found')

    const invoiceNumber = dto.invoiceNumber || (await this.generateInvoiceNumber())

    return this.prisma.$transaction(async (tx) => {
      // For each item, resolve or create batch
      const resolvedItems: { batchId: number; item: any }[] = []

      for (const item of dto.items) {
        let batchId: number

        if (item.batchId) {
          const batch = await tx.batch.findUnique({ where: { id: item.batchId } })
          if (!batch) throw new NotFoundException(`Batch ${item.batchId} not found`)
          batchId = batch.id
        } else {
          // Create new batch inline
          const newBatch = await tx.batch.create({
            data: {
              medicineId: item.medicineId,
              batchNumber: item.batchNumber ?? `BATCH-${Date.now()}`,
              mfgDate: item.mfgDate ? new Date(item.mfgDate) : undefined,
              expiryDate: new Date(item.expiryDate),
              purchaseRate: item.purchaseRate,
              saleRate: item.saleRate,
              quantity: 0,
              freeQuantity: item.freeQuantity ?? 0,
              supplierId: dto.supplierId,
            },
          })
          batchId = newBatch.id
        }

        resolvedItems.push({ batchId, item })
      }

      const purchase = await tx.purchase.create({
        data: {
          invoiceNumber,
          supplierId: dto.supplierId,
          status: (() => {
            const paid = Number(dto.amountPaid ?? 0)
            const total = Number(dto.total)
            if (paid >= total) return PurchaseStatus.RECEIVED
            if (paid > 0) return PurchaseStatus.PARTIAL
            return PurchaseStatus.RECEIVED
          })(),
          subtotal: dto.subtotal,
          discountAmount: dto.discountAmount ?? 0,
          taxAmount: dto.taxAmount ?? 0,
          total: dto.total,
          amountPaid: dto.amountPaid ?? 0,
          notes: dto.notes,
          purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : new Date(),
          items: {
            create: resolvedItems.map(({ batchId, item }) => ({
              batchId,
              quantity: item.quantity,
              freeQuantity: item.freeQuantity ?? 0,
              purchaseRate: item.purchaseRate,
              saleRate: item.saleRate,
              discount: item.discount ?? 0,
              taxRate: item.taxRate ?? 0,
              total: item.total,
            })),
          },
        },
        include: { items: true },
      })

      // Increment batch quantities and create stock movements
      for (const { batchId, item } of resolvedItems) {
        await tx.batch.update({
          where: { id: batchId },
          data: {
            quantity: { increment: item.quantity + (item.freeQuantity ?? 0) },
          },
        })
        await tx.stockMovement.create({
          data: {
            batchId,
            type: MovementType.PURCHASE,
            quantity: item.quantity + (item.freeQuantity ?? 0),
            referenceId: purchase.id,
          },
        })
      }

      // Update supplier payable balance
      const unpaid = Number(dto.total) - Number(dto.amountPaid ?? 0)
      if (unpaid > 0) {
        await tx.supplier.update({
          where: { id: dto.supplierId },
          data: { payableBalance: { increment: unpaid } },
        })
      }

      // TODO: audit log
      return purchase
    })
  }

  async findAll(page = 1, limit = 50, supplierId?: number, from?: string, to?: string) {
    const skip = (page - 1) * limit
    const where: any = {}
    if (supplierId) where.supplierId = supplierId
    if (from || to) {
      where.purchaseDate = {}
      if (from) where.purchaseDate.gte = new Date(from)
      if (to) where.purchaseDate.lte = new Date(to)
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchase.findMany({
        where,
        include: { supplier: true },
        skip,
        take: limit,
        orderBy: { purchaseDate: 'desc' },
      }),
      this.prisma.purchase.count({ where }),
    ])
    return { data, total }
  }

  async findOne(id: number) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: { batch: { include: { medicine: true } } },
        },
      },
    })
    if (!purchase) throw new NotFoundException('Purchase not found')
    return purchase
  }

  async createReturn(purchaseId: number, dto: any) {
    const purchase = await this.findOne(purchaseId)

    return this.prisma.$transaction(async (tx) => {
      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          purchaseId,
          supplierId: purchase.supplierId,
          reason: dto.reason,
          totalAmount: dto.totalAmount,
          items: {
            create: dto.items.map((i: any) => ({
              batchId: i.batchId,
              quantity: i.quantity,
              amount: i.amount,
            })),
          },
        },
        include: { items: true },
      })

      // Decrement batch quantities and create stock movements
      for (const item of dto.items) {
        const batch = await tx.batch.findUnique({ where: { id: item.batchId } })
        if (!batch) throw new NotFoundException(`Batch ${item.batchId} not found`)
        if (batch.quantity < item.quantity) {
          throw new BadRequestException(`Insufficient stock in batch ${item.batchId}`)
        }

        await tx.batch.update({
          where: { id: item.batchId },
          data: { quantity: { decrement: item.quantity } },
        })
        await tx.stockMovement.create({
          data: {
            batchId: item.batchId,
            type: MovementType.PURCHASE_RETURN,
            quantity: -item.quantity,
            referenceId: purchaseReturn.id,
            reason: dto.reason,
          },
        })
      }

      // Adjust supplier payable balance
      await tx.supplier.update({
        where: { id: purchase.supplierId },
        data: { payableBalance: { decrement: Number(dto.totalAmount) } },
      })

      // TODO: audit log
      return purchaseReturn
    })
  }
}
