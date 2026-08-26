import { Test, TestingModule } from '@nestjs/testing'
import { UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { AuthService } from './auth.service'
import { PrismaService } from '../prisma/prisma.service'

const mockPrisma = {
  user: { findUnique: jest.fn() },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
}

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock-access-token'),
}

const mockConfig = {
  get: jest.fn().mockReturnValue('mock-secret'),
}

const activeUser = {
  id: 1,
  username: 'admin',
  fullName: 'Admin User',
  role: 'ADMIN',
  isActive: true,
  passwordHash: '',
}

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile()
    service = module.get<AuthService>(AuthService)
    jest.clearAllMocks()
  })

  describe('login', () => {
    it('returns tokens and user on valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 10)
      mockPrisma.user.findUnique.mockResolvedValue({ ...activeUser, passwordHash: hash })
      mockPrisma.refreshToken.create.mockResolvedValue({})
      mockJwt.sign.mockReturnValue('test-token')

      const result = await service.login('admin', 'password123')

      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
      expect(result.user.username).toBe('admin')
      expect(result.user).not.toHaveProperty('passwordHash')
    })

    it('throws UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(service.login('unknown', 'pass')).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when user is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...activeUser, isActive: false })

      await expect(service.login('admin', 'pass')).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when password is wrong', async () => {
      const hash = await bcrypt.hash('correct-password', 10)
      mockPrisma.user.findUnique.mockResolvedValue({ ...activeUser, passwordHash: hash })

      await expect(service.login('admin', 'wrong-password')).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('refresh', () => {
    it('returns new accessToken for valid non-expired token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        token: 'valid-token',
        revoked: false,
        expiresAt: new Date(Date.now() + 60000),
        user: { id: 1, username: 'admin', role: 'ADMIN' },
      })
      mockJwt.sign.mockReturnValue('new-access-token')

      const result = await service.refresh('valid-token')

      expect(result.accessToken).toBe('new-access-token')
    })

    it('throws UnauthorizedException for revoked token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        token: 'revoked-token',
        revoked: true,
        expiresAt: new Date(Date.now() + 60000),
        user: { id: 1 },
      })

      await expect(service.refresh('revoked-token')).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException for expired token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        token: 'expired-token',
        revoked: false,
        expiresAt: new Date(Date.now() - 1000),
        user: { id: 1 },
      })

      await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException)
    })

    it('throws UnauthorizedException when token not found', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null)

      await expect(service.refresh('ghost-token')).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('logout', () => {
    it('revokes the refresh token', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 })

      await service.logout('some-token')

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { token: 'some-token' },
        data: { revoked: true },
      })
    })
  })
})
