import { Test, TestingModule } from '@nestjs/testing'
import { ConflictException, NotFoundException } from '@nestjs/common'
import { MedicinesService } from './medicines.service'
import { PrismaService } from '../prisma/prisma.service'

const mockPrisma = {
  medicine: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  batch: { findMany: jest.fn() },
  saleItem: { count: jest.fn() },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
}

const baseMedicine = {
  id: 1,
  brandName: 'Panadol',
  genericName: 'Paracetamol',
  productCode: 'MED-001',
  isActive: true,
  categoryId: 1,
  manufacturerId: 1,
  reorderLevel: 10,
  taxRate: 0,
  prescriptionRequired: false,
}

describe('MedicinesService', () => {
  let service: MedicinesService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicinesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get<MedicinesService>(MedicinesService)
    jest.clearAllMocks()
  })

  describe('findOne', () => {
    it('returns medicine when found', async () => {
      mockPrisma.medicine.findUnique.mockResolvedValue(baseMedicine)

      const result = await service.findOne(1)

      expect(result.brandName).toBe('Panadol')
    })

    it('throws NotFoundException when medicine not found', async () => {
      mockPrisma.medicine.findUnique.mockResolvedValue(null)

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('creates medicine successfully when productCode is unique', async () => {
      mockPrisma.medicine.findUnique.mockResolvedValue(null)
      mockPrisma.medicine.create.mockResolvedValue(baseMedicine)

      const result = await service.create({ brandName: 'Panadol', productCode: 'MED-001' })

      expect(result.brandName).toBe('Panadol')
      expect(mockPrisma.medicine.create).toHaveBeenCalled()
    })

    it('throws ConflictException when productCode already exists', async () => {
      mockPrisma.medicine.findUnique.mockResolvedValue(baseMedicine)

      await expect(service.create({ brandName: 'Panadol', productCode: 'MED-001' })).rejects.toThrow(ConflictException)
    })

    it('creates medicine without productCode skipping uniqueness check', async () => {
      mockPrisma.medicine.create.mockResolvedValue({ ...baseMedicine, productCode: null, brandName: 'Generic Med' })

      const result = await service.create({ brandName: 'Generic Med' })

      expect(result.brandName).toBe('Generic Med')
    })
  })

  describe('deactivate', () => {
    it('hard-deletes medicine when it has no sales transactions', async () => {
      mockPrisma.medicine.findUnique.mockResolvedValue(baseMedicine)
      mockPrisma.saleItem.count.mockResolvedValue(0)
      mockPrisma.medicine.delete.mockResolvedValue(baseMedicine)

      await service.deactivate(1)

      expect(mockPrisma.medicine.delete).toHaveBeenCalledWith({ where: { id: 1 } })
    })

    it('soft-deletes (sets isActive=false) when medicine has sales', async () => {
      mockPrisma.medicine.findUnique.mockResolvedValue(baseMedicine)
      mockPrisma.saleItem.count.mockResolvedValue(15)
      mockPrisma.medicine.update.mockResolvedValue({ ...baseMedicine, isActive: false })

      await service.deactivate(1)

      expect(mockPrisma.medicine.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      })
    })
  })

  describe('search', () => {
    it('calls findMany with the search query', async () => {
      mockPrisma.medicine.findMany.mockResolvedValue([baseMedicine])

      const result = await service.search('Panadol')

      expect(mockPrisma.medicine.findMany).toHaveBeenCalled()
      expect(result).toHaveLength(1)
    })
  })

  describe('findAll', () => {
    it('returns paginated medicines with batch totals', async () => {
      const medicineWithBatches = {
        ...baseMedicine,
        category: { name: 'Analgesic' },
        manufacturer: { name: 'GSK' },
        batches: [{ id: 1, quantity: 50, expiryDate: new Date('2027-01-01'), purchaseRate: 10, saleRate: 15, freeQuantity: 0, batchNumber: 'B001' }],
      }
      mockPrisma.$transaction.mockResolvedValue([[medicineWithBatches], 1])
      mockPrisma.medicine.findMany.mockResolvedValue([medicineWithBatches])
      mockPrisma.medicine.count.mockResolvedValue(1)

      const result = await service.findAll(1, 50)

      expect(result.total).toBe(1)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].totalQty).toBe(50)
    })
  })
})
