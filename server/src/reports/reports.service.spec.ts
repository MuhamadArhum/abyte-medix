import { Test, TestingModule } from '@nestjs/testing'
import { ReportsService } from './reports.service'
import { PrismaService } from '../prisma/prisma.service'

const mockPrisma = {
  sale: { findMany: jest.fn() },
  expense: { aggregate: jest.fn() },
  income: { aggregate: jest.fn() },
  saleItem: { findMany: jest.fn() },
  purchase: { findMany: jest.fn() },
  medicine: { findMany: jest.fn() },
  stockMovement: { findMany: jest.fn() },
}

describe('ReportsService', () => {
  let service: ReportsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get<ReportsService>(ReportsService)
    jest.clearAllMocks()
  })

  describe('profitLoss', () => {
    it('calculates revenue, cogs, gross profit and net profit correctly', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([
        {
          total: '500.00',
          items: [
            { quantity: 10, total: '300.00', batch: { purchaseRate: '20.00' } },
            { quantity: 5,  total: '200.00', batch: { purchaseRate: '20.00' } },
          ],
        },
      ])
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: '50.00' } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: '0' } })

      const result = await service.profitLoss()

      expect(result.revenue).toBe(500)
      expect(result.cogs).toBe(300)        // (10+5) × 20
      expect(result.grossProfit).toBe(200)
      expect(result.grossMargin).toBe(40)  // 200/500 × 100
      expect(result.expenses).toBe(50)
      expect(result.netProfit).toBe(150)   // 200 - 50 + 0
      expect(result.salesCount).toBe(1)
    })

    it('returns zero net profit when no sales', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([])
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: null } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: null } })

      const result = await service.profitLoss()

      expect(result.revenue).toBe(0)
      expect(result.grossProfit).toBe(0)
      expect(result.grossMargin).toBe(0)
      expect(result.netProfit).toBe(0)
    })

    it('accounts for other income in net profit', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([
        { total: '1000', items: [{ quantity: 10, total: '1000', batch: { purchaseRate: '60' } }] },
      ])
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: '100' } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: '200' } })

      const result = await service.profitLoss()

      expect(result.cogs).toBe(600)
      expect(result.grossProfit).toBe(400)
      expect(result.netProfit).toBe(500) // 400 - 100 + 200
    })
  })

  describe('salesByPeriod', () => {
    it('groups sales by day correctly', async () => {
      const d1 = new Date('2026-08-01T10:00:00Z')
      const d2 = new Date('2026-08-01T15:00:00Z')
      const d3 = new Date('2026-08-02T09:00:00Z')

      mockPrisma.sale.findMany.mockResolvedValue([
        { createdAt: d1, total: '200', discountAmount: '10', taxAmount: '0' },
        { createdAt: d2, total: '300', discountAmount: '0',  taxAmount: '0' },
        { createdAt: d3, total: '150', discountAmount: '5',  taxAmount: '0' },
      ])

      const result = await service.salesByPeriod(undefined, undefined, 'day')

      expect(result).toHaveLength(2)
      const aug1 = result.find(r => r.period === '2026-08-01')
      expect(aug1?.total).toBe(500)
      expect(aug1?.count).toBe(2)
    })
  })

  describe('salesByProduct', () => {
    it('aggregates qty and revenue per medicine sorted by revenue', async () => {
      mockPrisma.saleItem.findMany.mockResolvedValue([
        { quantity: 10, total: '500', batch: { medicine: { id: 1, brandName: 'Panadol', genericName: 'Paracetamol' } } },
        { quantity: 3,  total: '900', batch: { medicine: { id: 2, brandName: 'Augmentin', genericName: 'Amoxicillin' } } },
        { quantity: 5,  total: '250', batch: { medicine: { id: 1, brandName: 'Panadol', genericName: 'Paracetamol' } } },
      ])

      const result = await service.salesByProduct()

      expect(result[0].brandName).toBe('Augmentin')
      expect(result[1].brandName).toBe('Panadol')
      expect(result[1].totalQty).toBe(15)
      expect(result[1].totalRevenue).toBe(750)
    })
  })

  describe('inventoryValuation', () => {
    it('calculates cost and sale values per medicine', async () => {
      mockPrisma.medicine.findMany.mockResolvedValue([
        {
          id: 1,
          brandName: 'Panadol',
          batches: [
            { quantity: 100, purchaseRate: '10', saleRate: '15' },
            { quantity: 50,  purchaseRate: '10', saleRate: '15' },
          ],
        },
      ])

      const result = await service.inventoryValuation()

      expect(result).toHaveLength(1)
      expect(result[0].totalQty).toBe(150)
      expect(result[0].costValue).toBe(1500)
      expect(result[0].saleValue).toBe(2250)
    })
  })
})
