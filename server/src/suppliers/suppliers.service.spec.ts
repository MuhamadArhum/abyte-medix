import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { SuppliersService } from './suppliers.service'
import { PrismaService } from '../prisma/prisma.service'

const mockTx = {
  payment: { create: jest.fn() },
  supplier: { update: jest.fn() },
}

const mockPrisma = {
  supplier: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  purchase: { findMany: jest.fn() },
  payment: { findMany: jest.fn() },
  purchaseReturn: { findMany: jest.fn() },
  $transaction: jest.fn(),
}

const baseSupplier = {
  id: 1,
  name: 'MediCo',
  contactPerson: 'Ali',
  phone: '042-111',
  address: 'Karachi',
  payableBalance: 10000,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('SuppliersService', () => {
  let service: SuppliersService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get<SuppliersService>(SuppliersService)
    jest.clearAllMocks()
  })

  describe('findOne', () => {
    it('returns supplier when found', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(baseSupplier)

      const result = await service.findOne(1)

      expect(result.name).toBe('MediCo')
    })

    it('throws NotFoundException when supplier not found', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(null)

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('makePayment', () => {
    it('creates payment and decrements payable balance', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(baseSupplier)
      mockTx.payment.create.mockResolvedValue({ id: 1, amount: 3000 })
      mockTx.supplier.update.mockResolvedValue({})
      mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockTx))

      const result = await service.makePayment(1, { amount: 3000, method: 'CASH' })

      expect(mockTx.supplier.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { payableBalance: { decrement: 3000 } },
      })
      expect(result.id).toBe(1)
    })

    it('throws BadRequestException when amount is zero or negative', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(baseSupplier)

      await expect(service.makePayment(1, { amount: 0 })).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when payment exceeds payable balance', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue({ ...baseSupplier, payableBalance: 1000 })

      await expect(service.makePayment(1, { amount: 5000 })).rejects.toThrow(BadRequestException)
    })
  })

  describe('deactivate / reactivate', () => {
    it('sets isActive to false on deactivate', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(baseSupplier)
      mockPrisma.supplier.update.mockResolvedValue({ ...baseSupplier, isActive: false })

      await service.deactivate(1)

      expect(mockPrisma.supplier.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      })
    })

    it('sets isActive to true on reactivate', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue({ ...baseSupplier, isActive: false })
      mockPrisma.supplier.update.mockResolvedValue({ ...baseSupplier, isActive: true })

      await service.reactivate(1)

      expect(mockPrisma.supplier.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: true },
      })
    })
  })

  describe('findAll', () => {
    it('returns paginated results', async () => {
      mockPrisma.$transaction.mockResolvedValue([[baseSupplier], 1])

      const result = await service.findAll(1, 50)

      expect(result.total).toBe(1)
      expect(result.data).toHaveLength(1)
    })
  })
})
