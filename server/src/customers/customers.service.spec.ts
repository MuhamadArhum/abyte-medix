import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { CustomersService } from './customers.service'
import { PrismaService } from '../prisma/prisma.service'

const mockTx = {
  payment: { create: jest.fn() },
  customer: { update: jest.fn() },
}

const mockPrisma = {
  customer: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  sale: { findMany: jest.fn() },
  payment: { findMany: jest.fn() },
  saleReturn: { findMany: jest.fn() },
  $transaction: jest.fn(),
}

const baseCustomer = {
  id: 1,
  name: 'Ahmed Khan',
  phone: '0300-1234567',
  address: 'Lahore',
  creditLimit: 5000,
  outstandingBalance: 1000,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('CustomersService', () => {
  let service: CustomersService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get<CustomersService>(CustomersService)
    jest.clearAllMocks()
  })

  describe('findOne', () => {
    it('returns the customer when found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer)

      const result = await service.findOne(1)

      expect(result.name).toBe('Ahmed Khan')
    })

    it('throws NotFoundException when customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null)

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('findAll', () => {
    it('returns paginated results', async () => {
      mockPrisma.$transaction.mockResolvedValue([[baseCustomer], 1])

      const result = await service.findAll(1, 50)

      expect(result.total).toBe(1)
      expect(result.data).toHaveLength(1)
    })

    it('applies search filter', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0])
      mockPrisma.customer.findMany.mockResolvedValue([])
      mockPrisma.customer.count.mockResolvedValue(0)

      await service.findAll(1, 50, 'Ahmed')

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) })
      )
    })
  })

  describe('receivePayment', () => {
    it('creates payment and decrements outstanding balance', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer)
      mockTx.payment.create.mockResolvedValue({ id: 10, amount: 500 })
      mockTx.customer.update.mockResolvedValue({})
      mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockTx))

      const result = await service.receivePayment(1, { amount: 500, method: 'CASH' })

      expect(mockTx.customer.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { outstandingBalance: { decrement: 500 } },
      })
      expect(result.id).toBe(10)
    })

    it('throws BadRequestException when amount is zero', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer)

      await expect(service.receivePayment(1, { amount: 0 })).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when payment exceeds outstanding balance', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({ ...baseCustomer, outstandingBalance: 200 })

      await expect(service.receivePayment(1, { amount: 500 })).rejects.toThrow(BadRequestException)
    })
  })

  describe('creditCheck', () => {
    it('approves credit when available credit is sufficient', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({ ...baseCustomer, creditLimit: 5000, outstandingBalance: 1000 })

      const result = await service.creditCheck(1, 2000)

      expect(result.approved).toBe(true)
      expect(result.availableCredit).toBe(4000)
    })

    it('rejects credit when available credit is insufficient', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({ ...baseCustomer, creditLimit: 1000, outstandingBalance: 800 })

      const result = await service.creditCheck(1, 500)

      expect(result.approved).toBe(false)
      expect(result.availableCredit).toBe(200)
    })

    it('calculates available credit correctly', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({ ...baseCustomer, creditLimit: 10000, outstandingBalance: 3000 })

      const result = await service.creditCheck(1, 100)

      expect(result.creditLimit).toBe(10000)
      expect(result.outstandingBalance).toBe(3000)
      expect(result.availableCredit).toBe(7000)
    })
  })

  describe('deactivate / reactivate', () => {
    it('sets isActive to false on deactivate', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(baseCustomer)
      mockPrisma.customer.update.mockResolvedValue({ ...baseCustomer, isActive: false })

      await service.deactivate(1)

      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
      })
    })

    it('sets isActive to true on reactivate', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({ ...baseCustomer, isActive: false })
      mockPrisma.customer.update.mockResolvedValue({ ...baseCustomer, isActive: true })

      await service.reactivate(1)

      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: true },
      })
    })
  })
})
