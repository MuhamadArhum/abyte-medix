import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

export interface AuditLogData {
  userId?: number
  module: string
  action: string
  recordId?: number
  oldValue?: any
  newValue?: any
  terminalId?: string
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: AuditLogData) {
    return this.prisma.auditLog.create({
      data: {
        userId: data.userId,
        module: data.module,
        action: data.action,
        recordId: data.recordId,
        oldValue: data.oldValue ?? undefined,
        newValue: data.newValue ?? undefined,
        terminalId: data.terminalId,
      },
    })
  }

  async findAll(
    page = 1,
    limit = 50,
    userId?: number,
    module?: string,
    from?: string,
    to?: string,
  ) {
    const skip = (page - 1) * limit
    const where: any = {}
    if (userId) where.userId = userId
    if (module) where.module = { contains: module }
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) { const d = new Date(to); d.setHours(23, 59, 59, 999); where.createdAt.lte = d }
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { fullName: true, username: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ])
    return { data, total }
  }
}
