import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { ShiftsService } from './shifts.service'
import { PrismaService } from '../prisma/prisma.service'

const mockPrisma = {
  shift: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  sale: { findMany: jest.fn() },
  $transaction: jest.fn(),
}

const openShift = {
  id: 1,
  status: 'OPEN',
  openedById: 1,
  openingBalance: 5000,
  openedAt: new Date(),
  openedBy: { fullName: 'Admin' },
}

describe('ShiftsService', () => {
  let service: ShiftsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get<ShiftsService>(ShiftsService)
    jest.clearAllMocks()
  })

  describe('openShift', () => {
    it('creates a new shift when none is open', async () => {
      mockPrisma.shift.findFirst.mockResolvedValue(null)
      mockPrisma.shift.create.mockResolvedValue(openShift)

      const result = await service.openShift(1, 5000)

      expect(result.status).toBe('OPEN')
      expect(mockPrisma.shift.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ openedById: 1, openingBalance: 5000, status: 'OPEN' }),
        })
      )
    })

    it('throws BadRequestException when a shift is already open', async () => {
      mockPrisma.shift.findFirst.mockResolvedValue(openShift)

      await expect(service.openShift(1, 0)).rejects.toThrow(BadRequestException)
    })
  })

  describe('getCurrentShift', () => {
    it('returns null when no shift is open', async () => {
      mockPrisma.shift.findFirst.mockResolvedValue(null)

      const result = await service.getCurrentShift()

      expect(result).toBeNull()
    })

    it('returns shift with live sales totals', async () => {
      mockPrisma.shift.findFirst.mockResolvedValue(openShift)
      mockPrisma.sale.findMany.mockResolvedValue([
        { total: '500', paymentMethod: 'CASH', amountPaid: '500' },
        { total: '300', paymentMethod: 'CREDIT', amountPaid: '0' },
        { total: '400', paymentMethod: 'CARD', amountPaid: '400' },
      ])

      const result = await service.getCurrentShift()

      expect(result).not.toBeNull()
      expect(result!.totalSales).toBe(1200)
      expect(result!.cashSales).toBe(500)
      expect(result!.creditSales).toBe(300)
      expect(result!.cardSales).toBe(400)
      expect(result!.saleCount).toBe(3)
    })
  })

  describe('closeShift', () => {
    it('closes shift and returns totals', async () => {
      mockPrisma.shift.findUnique.mockResolvedValue(openShift)
      mockPrisma.sale.findMany.mockResolvedValue([
        { total: '1000', paymentMethod: 'CASH', amountPaid: '1000' },
        { total: '500', paymentMethod: 'CREDIT', amountPaid: '0' },
      ])
      mockPrisma.shift.update.mockResolvedValue({
        ...openShift,
        status: 'CLOSED',
        closedAt: new Date(),
        openedBy: { fullName: 'Admin' },
        closedBy: { fullName: 'Admin' },
      })

      const result = await service.closeShift(1, 1, 6000, 'All clear')

      expect(result.status).toBe('CLOSED')
      expect(result.totalSales).toBe(1500)
      expect(result.cashSales).toBe(1000)
      expect(result.creditSales).toBe(500)
    })

    it('throws NotFoundException when shift not found', async () => {
      mockPrisma.shift.findUnique.mockResolvedValue(null)

      await expect(service.closeShift(999, 1)).rejects.toThrow(NotFoundException)
    })

    it('throws BadRequestException when shift is already closed', async () => {
      mockPrisma.shift.findUnique.mockResolvedValue({ ...openShift, status: 'CLOSED' })

      await expect(service.closeShift(1, 1)).rejects.toThrow(BadRequestException)
    })
  })

  describe('getShiftSummary', () => {
    it('throws NotFoundException when shift not found', async () => {
      mockPrisma.shift.findUnique.mockResolvedValue(null)

      await expect(service.getShiftSummary(999)).rejects.toThrow(NotFoundException)
    })

    it('returns shift with sales breakdown', async () => {
      mockPrisma.shift.findUnique.mockResolvedValue({
        ...openShift,
        status: 'CLOSED',
        openedBy: { fullName: 'Admin' },
        closedBy: null,
      })
      mockPrisma.sale.findMany.mockResolvedValue([
        { total: '200', paymentMethod: 'CASH', invoiceNumber: 'INV-001', createdAt: new Date(), amountPaid: '200' },
        { total: '300', paymentMethod: 'CARD', invoiceNumber: 'INV-002', createdAt: new Date(), amountPaid: '300' },
      ])

      const result = await service.getShiftSummary(1)

      expect(result.saleCount).toBe(2)
      expect(result.totalSales).toBe(500)
      expect(result.cashSales).toBe(200)
      expect(result.cardSales).toBe(300)
    })
  })
})
