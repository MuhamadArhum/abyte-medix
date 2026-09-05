import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { MovementType, SaleStatus, ShiftStatus } from '@prisma/client'

interface SaleItemDto {
  batchId: number
  quantity: number
  saleRate: number
  discount: number
  taxRate: number
  total: number
}

interface CreateSaleDto {
  customerId?: number
  userId: number
  terminalId?: string
  items: SaleItemDto[]
  discountAmount: number
  taxAmount: number
  subtotal: number
  total: number
  amountPaid: number
  changeAmount: number
  paymentMethod: string
  notes?: string
  quotationId?: number
}

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  private async generateInvoiceNumber(): Promise<string> {
    const prefix = await this.prisma.setting
      .findUnique({ where: { key: 'invoice_prefix' } })
      .then((s) => s?.value ?? 'INV')

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const pattern = `${prefix}-${dateStr}-`

    const last = await this.prisma.sale.findFirst({
      where: { invoiceNumber: { startsWith: pattern } },
      orderBy: { id: 'desc' },
      select: { invoiceNumber: true },
    })

    let seq = 1
    if (last) {
      const tail = last.invoiceNumber.slice(pattern.length)
      const n = parseInt(tail, 10)
      if (!isNaN(n)) seq = n + 1
    }

    return `${pattern}${String(seq).padStart(4, '0')}`
  }

  async createSale(dto: CreateSaleDto) {
    // Validate all items and batch availability before opening a transaction
    for (const item of dto.items) {
      if (item.quantity <= 0) throw new BadRequestException(`Quantity must be > 0 for batch ${item.batchId}`)
      if (item.saleRate < 0) throw new BadRequestException(`Sale rate cannot be negative for batch ${item.batchId}`)

      const batch = await this.prisma.batch.findUnique({ where: { id: item.batchId } })
      if (!batch) throw new NotFoundException(`Batch ${item.batchId} not found`)
      if (batch.quantity < item.quantity) {
        throw new BadRequestException(`Insufficient stock for batch ${item.batchId}`)
      }
    }

    // Validate customer is active for credit/split payments
    if (dto.customerId && (dto.paymentMethod === 'CREDIT' || dto.paymentMethod === 'SPLIT')) {
      const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } })
      if (!customer) throw new NotFoundException('Customer not found')
      if (!customer.isActive) throw new BadRequestException('Customer account is inactive')
    }

    const invoiceNumber = await this.generateInvoiceNumber()

    return this.prisma.$transaction(async (tx) => {
      // Look up current open shift to link sale
      const currentShift = await tx.shift.findFirst({ where: { status: ShiftStatus.OPEN }, orderBy: { openedAt: 'desc' } })

      // Create sale
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: dto.customerId,
          userId: dto.userId,
          terminalId: dto.terminalId,
          status: SaleStatus.COMPLETED,
          subtotal: dto.subtotal,
          discountAmount: dto.discountAmount,
          taxAmount: dto.taxAmount,
          total: dto.total,
          amountPaid: dto.amountPaid,
          changeAmount: dto.changeAmount,
          paymentMethod: dto.paymentMethod as any,
          notes: dto.notes,
          shiftId: currentShift?.id ?? null,
          items: {
            create: dto.items.map((i) => ({
              batchId: i.batchId,
              quantity: i.quantity,
              saleRate: i.saleRate,
              discount: i.discount,
              taxRate: i.taxRate,
              total: i.total,
            })),
          },
        },
        include: { items: true },
      })

      // Atomically decrement stock and record movements
      for (const item of dto.items) {
        await tx.batch.update({
          where: { id: item.batchId },
          data: { quantity: { decrement: item.quantity } },
        })
        await tx.stockMovement.create({
          data: {
            batchId: item.batchId,
            type: MovementType.SALE,
            quantity: -item.quantity,
            referenceId: sale.id,
          },
        })
      }

      // Update customer balance if credit or split payment
      if (dto.customerId && (dto.paymentMethod === 'CREDIT' || dto.paymentMethod === 'SPLIT')) {
        const creditPortion = dto.total - dto.amountPaid
        if (creditPortion > 0) {
          await tx.customer.update({
            where: { id: dto.customerId },
            data: { outstandingBalance: { increment: creditPortion } },
          })
        }
      }

      // If sale was created from a quotation, delete the quotation
      if (dto.quotationId) {
        const quot = await tx.sale.findUnique({ where: { id: dto.quotationId } })
        if (quot && quot.status === 'DRAFT' && quot.invoiceNumber.startsWith('QUOT-')) {
          await tx.saleItem.deleteMany({ where: { saleId: dto.quotationId } })
          await tx.sale.delete({ where: { id: dto.quotationId } })
        }
      }

      return sale
    })
  }

  async findAll(
    page = 1, limit = 50,
    from?: string, to?: string,
    customerId?: number, search?: string,
    paymentMethod?: string, status?: string,
  ) {
    const skip = (page - 1) * limit
    const where: any = {}

    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) {
        const toDate = new Date(to)
        toDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = toDate
      }
    }
    if (customerId) where.customerId = customerId
    if (paymentMethod) where.paymentMethod = paymentMethod
    if (status) {
      where.status = status
    } else {
      where.status = 'COMPLETED'
    }
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { customer: { name: { contains: search } } },
      ]
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        where,
        include: { customer: true, user: { select: { fullName: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sale.count({ where }),
    ])
    return { data, total }
  }

  async findOne(id: number) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        user: { select: { fullName: true } },
        items: {
          include: {
            batch: {
              include: { medicine: true },
            },
          },
        },
      },
    })
    if (!sale) throw new NotFoundException('Sale not found')
    return sale
  }

  async createReturn(saleId: number, dto: {
    reason: string
    items: { batchId: number; quantity: number; isDamaged: boolean; refundAmount: number }[]
    refundAmount: number
    refundMethod?: string
  }) {
    const sale = await this.findOne(saleId)

    return this.prisma.$transaction(async (tx) => {
      const saleReturn = await tx.saleReturn.create({
        data: {
          saleId,
          customerId: sale.customerId,
          reason: dto.reason,
          refundAmount: dto.refundAmount,
          refundMethod: dto.refundMethod,
          items: {
            create: dto.items.map((i) => ({
              batchId: i.batchId,
              quantity: i.quantity,
              isDamaged: i.isDamaged,
              refundAmount: i.refundAmount,
            })),
          },
        },
      })

      // Restore stock for non-damaged items
      for (const item of dto.items) {
        if (!item.isDamaged) {
          await tx.batch.update({
            where: { id: item.batchId },
            data: { quantity: { increment: item.quantity } },
          })
        }
        await tx.stockMovement.create({
          data: {
            batchId: item.batchId,
            type: MovementType.SALE_RETURN,
            quantity: item.isDamaged ? 0 : item.quantity,
            referenceId: saleReturn.id,
            reason: dto.reason,
          },
        })
      }

      return saleReturn
    })
  }

  getDailySummary(date?: string) {
    const day = date ? new Date(date) : new Date()
    const start = new Date(day.setHours(0, 0, 0, 0))
    const end = new Date(day.setHours(23, 59, 59, 999))

    return this.prisma.sale.aggregate({
      where: { createdAt: { gte: start, lte: end }, status: SaleStatus.COMPLETED },
      _sum: { total: true, discountAmount: true },
      _count: { id: true },
    })
  }

  private async saveDraft(prefix: string, dto: {
    userId: number; customerId?: number; terminalId?: string
    items: any[]; subtotal: number; discountAmount: number; taxAmount: number
    total: number; notes?: string
  }) {
    const invoiceNumber = `${prefix}-${Date.now()}`
    return this.prisma.sale.create({
      data: {
        invoiceNumber,
        customerId: dto.customerId,
        userId: dto.userId,
        terminalId: dto.terminalId,
        status: SaleStatus.DRAFT,
        subtotal: dto.subtotal ?? 0,
        discountAmount: dto.discountAmount ?? 0,
        taxAmount: dto.taxAmount ?? 0,
        total: dto.total,
        amountPaid: 0,
        changeAmount: 0,
        paymentMethod: 'CASH',
        notes: dto.notes,
        items: {
          create: dto.items.map((i) => ({
            batchId: i.batchId,
            quantity: i.qty ?? i.quantity ?? 1,
            saleRate: i.saleRate ?? 0,
            discount: i.discount ?? 0,
            taxRate: i.taxRate ?? 0,
            total: i.total ?? 0,
          })),
        },
      },
      include: {
        items: { include: { batch: { include: { medicine: true } } } },
        customer: true,
      },
    })
  }

  // Hold a sale (HOLD- prefix)
  async holdSale(dto: { userId: number; customerId?: number; terminalId?: string; items: any[]; subtotal: number; discountAmount: number; taxAmount: number; total: number; notes?: string }) {
    return this.saveDraft('HOLD', dto)
  }

  // Save a quotation (QUOT- prefix)
  async saveQuotation(dto: { userId: number; customerId?: number; items: any[]; subtotal: number; discountAmount: number; taxAmount: number; total: number; notes?: string }) {
    return this.saveDraft('QUOT', dto)
  }

  // Get held sales (HOLD- prefix only)
  getHeldSales(userId: number, terminalId?: string) {
    return this.prisma.sale.findMany({
      where: {
        status: SaleStatus.DRAFT,
        invoiceNumber: { startsWith: 'HOLD-' },
        userId,
        ...(terminalId ? { terminalId } : {}),
      },
      include: {
        items: { include: { batch: { include: { medicine: true } } } },
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // Get quotations (QUOT- prefix only)
  getQuotations() {
    return this.prisma.sale.findMany({
      where: {
        status: SaleStatus.DRAFT,
        invoiceNumber: { startsWith: 'QUOT-' },
      },
      include: {
        items: { include: { batch: { include: { medicine: true } } } },
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // Delete a draft (held or quotation)
  async discardDraft(saleId: number) {
    const sale = await this.prisma.sale.findUnique({ where: { id: saleId } })
    if (!sale) throw new NotFoundException('Sale not found')
    if (sale.status !== SaleStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT sales can be discarded')
    }
    return this.prisma.sale.delete({ where: { id: saleId } })
  }

  /** @deprecated use discardDraft */
  discardHeldSale(saleId: number) { return this.discardDraft(saleId) }
}
