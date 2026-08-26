import { Test, TestingModule } from '@nestjs/testing'
import { AuditService } from './audit.service'
import { PrismaService } from '../prisma/prisma.service'

const mockPrisma = {
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
}

describe('AuditService', () => {
  let service: AuditService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get<AuditService>(AuditService)
    jest.clearAllMocks()
  })

  describe('log', () => {
    it('creates an audit log entry with all fields', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 1 })

      await service.log({
        userId: 1,
        module: 'Sales',
        action: 'CREATE_SALE',
        recordId: 42,
        newValue: { total: 500 },
      })

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 1,
          module: 'Sales',
          action: 'CREATE_SALE',
          recordId: 42,
          newValue: { total: 500 },
        }),
      })
    })

    it('creates audit log with optional userId undefined', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({ id: 2 })

      await service.log({ module: 'System', action: 'STARTUP' })

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: undefined, module: 'System', action: 'STARTUP' }),
      })
    })
  })

  describe('findAll', () => {
    it('returns paginated audit logs', async () => {
      const logs = [
        { id: 1, module: 'Sales', action: 'CREATE_SALE', createdAt: new Date(), user: { fullName: 'Admin', username: 'admin' } },
      ]
      mockPrisma.$transaction.mockResolvedValue([logs, 1])

      const result = await service.findAll(1, 50)

      expect(result.total).toBe(1)
      expect(result.data).toHaveLength(1)
    })

    it('filters by userId', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0])
      mockPrisma.auditLog.findMany.mockResolvedValue([])
      mockPrisma.auditLog.count.mockResolvedValue(0)

      await service.findAll(1, 50, 2)

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 2 }) })
      )
    })

    it('filters by module name', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0])
      mockPrisma.auditLog.findMany.mockResolvedValue([])
      mockPrisma.auditLog.count.mockResolvedValue(0)

      await service.findAll(1, 50, undefined, 'Sales')

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ module: { contains: 'Sales' } }) })
      )
    })

    it('applies date range filter', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0])
      mockPrisma.auditLog.findMany.mockResolvedValue([])
      mockPrisma.auditLog.count.mockResolvedValue(0)

      await service.findAll(1, 50, undefined, undefined, '2026-08-01', '2026-08-31')

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ createdAt: expect.any(Object) }) })
      )
    })
  })
})
