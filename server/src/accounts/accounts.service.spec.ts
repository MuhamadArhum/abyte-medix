import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { AccountsService } from './accounts.service'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { PaymentType } from '@prisma/client'

const mockTx = {
  payment: { create: jest.fn() },
  customer: { update: jest.fn() },
  supplier: { update: jest.fn() },
}

const mockPrisma = {
  expense: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
  income: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
  payment: { findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
  sale: { aggregate: jest.fn() },
  purchase: { aggregate: jest.fn() },
  $transaction: jest.fn(),
}

const mockAudit = { log: jest.fn() }

describe('AccountsService', () => {
  let service: AccountsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile()
    service = module.get<AccountsService>(AccountsService)
    jest.clearAllMocks()
  })

  describe('createExpense', () => {
    it('creates expense and logs audit', async () => {
      const expense = { id: 1, category: 'Utilities', amount: 5000, date: new Date(), description: null }
      mockPrisma.expense.create.mockResolvedValue(expense)

      const result = await service.createExpense({ category: 'Utilities', amount: 5000 }, 1)

      expect(result.category).toBe('Utilities')
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE_EXPENSE' }))
    })

    it('uses current date when date not provided', async () => {
      const expense = { id: 1, category: 'Rent', amount: 10000, date: new Date(), description: null }
      mockPrisma.expense.create.mockResolvedValue(expense)

      await service.createExpense({ category: 'Rent', amount: 10000 })

      expect(mockPrisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ category: 'Rent' }) })
      )
    })
  })

  describe('createIncome', () => {
    it('creates income and logs audit', async () => {
      const income = { id: 1, category: 'Other', amount: 2000, date: new Date(), description: null }
      mockPrisma.income.create.mockResolvedValue(income)

      const result = await service.createIncome({ category: 'Other', amount: 2000 }, 1)

      expect(result.category).toBe('Other')
      expect(mockAudit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE_INCOME' }))
    })
  })

  describe('createPayment', () => {
    it('throws BadRequestException when type is missing', async () => {
      await expect(service.createPayment({ amount: 100 })).rejects.toThrow(BadRequestException)
    })

    it('creates CUSTOMER_RECEIPT and decrements customer balance', async () => {
      const payment = { id: 5, type: PaymentType.CUSTOMER_RECEIPT, amount: 1000, customerId: 1 }
      mockTx.payment.create.mockResolvedValue(payment)
      mockTx.customer.update.mockResolvedValue({})
      mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockTx))

      const result = await service.createPayment({
        type: PaymentType.CUSTOMER_RECEIPT,
        amount: 1000,
        customerId: 1,
        userId: 1,
      })

      expect(result.type).toBe(PaymentType.CUSTOMER_RECEIPT)
      expect(mockTx.customer.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { outstandingBalance: { decrement: 1000 } },
      })
    })

    it('creates SUPPLIER_PAYMENT and decrements supplier balance', async () => {
      const payment = { id: 6, type: PaymentType.SUPPLIER_PAYMENT, amount: 5000, supplierId: 2 }
      mockTx.payment.create.mockResolvedValue(payment)
      mockTx.supplier.update.mockResolvedValue({})
      mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockTx))

      await service.createPayment({
        type: PaymentType.SUPPLIER_PAYMENT,
        amount: 5000,
        supplierId: 2,
        userId: 1,
      })

      expect(mockTx.supplier.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { payableBalance: { decrement: 5000 } },
      })
    })

    it('does NOT update customer when customerId is missing', async () => {
      const payment = { id: 7, type: PaymentType.CUSTOMER_RECEIPT, amount: 500 }
      mockTx.payment.create.mockResolvedValue(payment)
      mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockTx))

      await service.createPayment({ type: PaymentType.CUSTOMER_RECEIPT, amount: 500, userId: 1 })

      expect(mockTx.customer.update).not.toHaveBeenCalled()
    })
  })

  describe('getSummary', () => {
    it('calculates all financial metrics correctly', async () => {
      mockPrisma.sale.aggregate
        .mockResolvedValueOnce({ _sum: { total: '10000' } })
        .mockResolvedValueOnce({ _sum: { discountAmount: '500' } })
        .mockResolvedValueOnce({ _sum: { taxAmount: '100' } })
        .mockResolvedValueOnce({ _sum: { total: '7000' } })
      mockPrisma.purchase.aggregate.mockResolvedValue({ _sum: { total: '6000' } })
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: '1000' } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: '500' } })
      mockPrisma.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: '3000' } })
        .mockResolvedValueOnce({ _sum: { amount: '2000' } })

      const result = await service.getSummary()

      expect(result.totalSales).toBe(10000)
      expect(result.totalPurchases).toBe(6000)
      expect(result.grossProfit).toBe(4000)       // 10000 - 6000
      expect(result.netProfit).toBe(3500)          // 4000 - 1000 + 500
      expect(result.totalExpenses).toBe(1000)
      expect(result.cashIn).toBe(10000)             // 7000 cash sales + 3000 receipts
      expect(result.cashOut).toBe(3000)             // 1000 expenses + 2000 supplier payments
    })

    it('handles null aggregates gracefully', async () => {
      mockPrisma.sale.aggregate.mockResolvedValue({ _sum: { total: null } })
      mockPrisma.sale.aggregate
        .mockResolvedValueOnce({ _sum: { total: null } })
        .mockResolvedValueOnce({ _sum: { discountAmount: null } })
        .mockResolvedValueOnce({ _sum: { taxAmount: null } })
        .mockResolvedValueOnce({ _sum: { total: null } })
      mockPrisma.purchase.aggregate.mockResolvedValue({ _sum: { total: null } })
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: null } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: null } })
      mockPrisma.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } })

      const result = await service.getSummary()

      expect(result.totalSales).toBe(0)
      expect(result.netProfit).toBe(0)
    })
  })
})
