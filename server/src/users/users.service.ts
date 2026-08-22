import { Injectable, ConflictException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'
import { Role } from '@prisma/client'
import * as bcrypt from 'bcrypt'

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(dto: {
    username: string
    password: string
    fullName: string
    role: Role
    allowedTerminals?: string
  }, actorId?: number) {
    const exists = await this.prisma.user.findUnique({ where: { username: dto.username } })
    if (exists) throw new ConflictException('Username already taken')

    const passwordHash = await bcrypt.hash(dto.password, 12)
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        fullName: dto.fullName,
        role: dto.role,
        allowedTerminals: dto.allowedTerminals,
      },
      select: { id: true, username: true, fullName: true, role: true, isActive: true, createdAt: true },
    })

    await this.audit.log({ userId: actorId, module: 'Users', action: 'CREATE_USER', recordId: user.id, newValue: { username: user.username, role: user.role } })
    return user
  }

  findAll() {
    return this.prisma.user.findMany({
      select: { id: true, username: true, fullName: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { permissions: true },
    })
    if (!user) throw new NotFoundException('User not found')
    const { passwordHash, ...rest } = user
    return rest
  }

  async update(id: number, dto: Partial<{ fullName: string; role: Role; isActive: boolean; allowedTerminals: string }>, actorId?: number) {
    const old = await this.findOne(id)
    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, username: true, fullName: true, role: true, isActive: true },
    })
    await this.audit.log({ userId: actorId, module: 'Users', action: 'UPDATE_USER', recordId: id, oldValue: old, newValue: dto })
    return updated
  }

  async resetPassword(id: number, newPassword: string, actorId?: number) {
    await this.findOne(id)
    const passwordHash = await bcrypt.hash(newPassword, 12)
    await this.prisma.user.update({ where: { id }, data: { passwordHash } })
    await this.audit.log({ userId: actorId, module: 'Users', action: 'RESET_PASSWORD', recordId: id })
    return { message: 'Password reset successfully' }
  }

  async setPermissions(userId: number, permissions: { module: string; action: string; granted: boolean }[], actorId?: number) {
    await this.prisma.userPermission.deleteMany({ where: { userId } })
    const result = await this.prisma.userPermission.createMany({
      data: permissions.map((p) => ({ userId, ...p })),
    })
    await this.audit.log({ userId: actorId, module: 'Users', action: 'SET_PERMISSIONS', recordId: userId, newValue: permissions })
    return result
  }
}
