import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { InventoryService } from './inventory.service'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'

const mockTx = {
  batch: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  stockMovement: { create: jest.fn() },
}

const mockPrisma = {
  medicine: { findMany: jest.fn(), count: jest.fn() },
  stockMovement: { findMany: jest.fn(), count: jest.fn() },
  batch: { findMany: jest.fn() },
  $transaction: jest.fn(),
}

const mockAudit = { log: jest.fn() }

describe('InventoryService', () => {
  let service: InventoryService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile()
    service = module.get<InventoryService>(InventoryService)
    jest.clearAllMocks()
  })

  describe('adjustment', () => {
    it('decrements batch quantity on ADJUSTMENT_OUT', async () => {
      mockTx.batch.findUnique.mockResolvedValue({ id: 1, quantity: 50 })
      mockTx.batch.update.mockResolvedValue({})
      mockTx.stockMovement.create.mockResolvedValue({ id: 99, type: 'ADJUSTMENT_OUT', quantity: -10 })

      mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockTx))

      const result = await service.adjustment({
        batchId: 1,
        type: 'ADJUSTMENT_OUT',
        quantity: 10,
        reason: 'Damaged',
      })

      expect(mockTx.batch.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { quantity: { decrement: 10 } },
      })
      expect(result.type).toBe('ADJUSTMENT_OUT')
    })

    it('increments batch quantity on ADJUSTMENT_IN', async () => {
      mockTx.batch.findUnique.mockResolvedValue({ id: 2, quantity: 20 })
      mockTx.batch.update.mockResolvedValue({})
      mockTx.stockMovement.create.mockResolvedValue({ id: 100, type: 'ADJUSTMENT_IN', quantity: 30 })

      mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockTx))

      await service.adjustment({ batchId: 2, type: 'ADJUSTMENT_IN', quantity: 30, reason: 'Recount' })

      expect(mockTx.batch.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { quantity: { increment: 30 } },
      })
    })

    it('throws BadRequestException when stock is insufficient for decrease', async () => {
      mockTx.batch.findUnique.mockResolvedValue({ id: 3, quantity: 5 })
      mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockTx))

      await expect(
        service.adjustment({ batchId: 3, type: 'ADJUSTMENT_OUT', quantity: 10, reason: 'Test' })
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException for invalid adjustment type', async () => {
      await expect(
        service.adjustment({ batchId: 1, type: 'INVALID' as any, quantity: 1, reason: 'Test' })
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when batch not found', async () => {
      mockTx.batch.findUnique.mockResolvedValue(null)
      mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockTx))

      await expect(
        service.adjustment({ batchId: 999, type: 'EXPIRY_WRITEOFF', quantity: 5, reason: 'Expired' })
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('getStock', () => {
    it('returns paginated medicines with totals', async () => {
      const medicines = [
        {
          id: 1, brandName: 'Panadol', genericName: 'Paracetamol', strength: '500mg',
          reorderLevel: 10,
          category: { name: 'Analgesic' },
          manufacturer: { name: 'GSK' },
          batches: [
            { id: 1, batchNumber: 'B001', expiryDate: new Date('2027-01-01'), purchaseRate: 10, saleRate: 15, quantity: 100, freeQuantity: 0 },
          ],
        },
      ]
      mockPrisma.$transaction.mockResolvedValue([medicines, 1])

      const result = await service.getStock(1, 25, '', '')

      expect(result.total).toBe(1)
      expect(result.data[0].totalQty).toBe(100)
      expect(result.data[0].brandName).toBe('Panadol')
    })

    it('filters out-of-stock medicines correctly', async () => {
      const medicines = [
        {
          id: 1, brandName: 'A', genericName: null, strength: null,
          reorderLevel: 10, category: null, manufacturer: null,
          batches: [{ id: 1, quantity: 0, expiryDate: new Date(), purchaseRate: 10, saleRate: 15, freeQuantity: 0, batchNumber: 'B1' }],
        },
        {
          id: 2, brandName: 'B', genericName: null, strength: null,
          reorderLevel: 10, category: null, manufacturer: null,
          batches: [{ id: 2, quantity: 50, expiryDate: new Date(), purchaseRate: 10, saleRate: 15, freeQuantity: 0, batchNumber: 'B2' }],
        },
      ]
      mockPrisma.medicine.findMany.mockResolvedValue(medicines)

      const result = await service.getStock(1, 25, '', 'out')

      expect(result.data).toHaveLength(1)
      expect(result.data[0].brandName).toBe('A')
    })
  })

  describe('getBatchesByMedicine', () => {
    it('returns batches ordered by expiry date', async () => {
      const batches = [
        { id: 1, expiryDate: new Date('2026-06-01'), medicine: { brandName: 'X' } },
        { id: 2, expiryDate: new Date('2026-12-01'), medicine: { brandName: 'X' } },
      ]
      mockPrisma.batch.findMany.mockResolvedValue(batches)

      const result = await service.getBatchesByMedicine(1)

      expect(result).toHaveLength(2)
      expect(mockPrisma.batch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { medicineId: 1 }, orderBy: { expiryDate: 'asc' } })
      )
    })
  })
})
