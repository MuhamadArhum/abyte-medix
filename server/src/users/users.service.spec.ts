import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import { UsersService } from './users.service'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { Role } from '@prisma/client'

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  sale: { count: jest.fn() },
  userPermission: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  refreshToken: { deleteMany: jest.fn() },
  $transaction: jest.fn(),
}

const mockAudit = { log: jest.fn() }

const baseUser = {
  id: 2,
  username: 'cashier1',
  fullName: 'Test Cashier',
  role: Role.CASHIER,
  isActive: true,
  createdAt: new Date(),
  permissions: [],
  passwordHash: 'hash',
}

describe('UsersService', () => {
  let service: UsersService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile()
    service = module.get<UsersService>(UsersService)
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('creates user and returns without passwordHash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue({
        id: 2, username: 'cashier1', fullName: 'Test Cashier', role: Role.CASHIER, isActive: true, createdAt: new Date(),
      })

      const result = await service.create(
        { username: 'cashier1', password: 'pass123', fullName: 'Test Cashier', role: Role.CASHIER },
        1,
      )

      expect(result.username).toBe('cashier1')
      expect(result).not.toHaveProperty('passwordHash')
      expect(mockAudit.log).toHaveBeenCalledTimes(1)
    })

    it('throws ConflictException when username already taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser)

      await expect(
        service.create({ username: 'cashier1', password: 'pass123', fullName: 'X', role: Role.CASHIER }, 1)
      ).rejects.toThrow(ConflictException)
    })

    it('throws BadRequestException for short password', async () => {
      await expect(
        service.create({ username: 'u1', password: 'abc', fullName: 'X', role: Role.CASHIER }, 1)
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when username is empty', async () => {
      await expect(
        service.create({ username: '', password: 'pass123', fullName: 'X', role: Role.CASHIER }, 1)
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('findOne', () => {
    it('returns user without passwordHash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser)

      const result = await service.findOne(2)

      expect(result).not.toHaveProperty('passwordHash')
      expect(result.username).toBe('cashier1')
    })

    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('delete', () => {
    it('deletes user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser)
      mockPrisma.sale.count.mockResolvedValue(0)
      mockPrisma.$transaction.mockResolvedValue([])

      const result = await service.delete(2, 1)

      expect(result.message).toBe('User deleted')
    })

    it('throws BadRequestException when deleting own account', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser)

      await expect(service.delete(2, 2)).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when deleting admin user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...baseUser, role: Role.ADMIN })

      await expect(service.delete(2, 1)).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when user has sales records', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser)
      mockPrisma.sale.count.mockResolvedValue(5)

      await expect(service.delete(2, 1)).rejects.toThrow(BadRequestException)
    })
  })

  describe('resetPassword', () => {
    it('resets password and returns success message', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser)
      mockPrisma.user.update.mockResolvedValue({})

      const result = await service.resetPassword(2, 'newpass123', 1)

      expect(result.message).toBe('Password reset successfully')
      expect(mockPrisma.user.update).toHaveBeenCalled()
    })

    it('throws BadRequestException for short new password', async () => {
      await expect(service.resetPassword(2, 'abc', 1)).rejects.toThrow(BadRequestException)
    })
  })

  describe('setPermissions', () => {
    it('replaces all permissions for a user', async () => {
      const permissions = [
        { module: 'sales', action: 'create', granted: true },
        { module: 'sales', action: 'read', granted: true },
      ]
      mockPrisma.userPermission.deleteMany.mockResolvedValue({})
      mockPrisma.userPermission.createMany.mockResolvedValue({ count: 2 })

      await service.setPermissions(2, permissions, 1)

      expect(mockPrisma.userPermission.deleteMany).toHaveBeenCalledWith({ where: { userId: 2 } })
      expect(mockPrisma.userPermission.createMany).toHaveBeenCalledWith({
        data: permissions.map(p => ({ userId: 2, ...p })),
      })
    })
  })
})
