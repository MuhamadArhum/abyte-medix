import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class LicenseService {
  constructor(private prisma: PrismaService) {}

  async getLicense() {
    return this.prisma.license.findFirst({ orderBy: { createdAt: 'desc' } })
  }

  async activate(dto: {
    licenseKey: string
    storeName: string
    plan: string
    maxPos?: number
    expiryDate?: string
  }) {
    return this.prisma.license.upsert({
      where: { licenseKey: dto.licenseKey },
      update: {
        storeName: dto.storeName,
        plan: dto.plan,
        maxPos: dto.maxPos ?? 1,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        status: 'ACTIVE',
        activationDate: new Date(),
        lastValidatedAt: new Date(),
      },
      create: {
        licenseKey: dto.licenseKey,
        storeName: dto.storeName,
        plan: dto.plan,
        maxPos: dto.maxPos ?? 1,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        status: 'ACTIVE',
        activationDate: new Date(),
        lastValidatedAt: new Date(),
      },
    })
  }

  async getStatus() {
    const license = await this.getLicense()
    if (!license) {
      return { valid: false, daysRemaining: 0, maxPos: 0, plan: null }
    }

    const now = new Date()
    let valid = license.status === 'ACTIVE'
    let daysRemaining = 0

    if (license.expiryDate) {
      const diff = license.expiryDate.getTime() - now.getTime()
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
      if (daysRemaining === 0) valid = false
    } else {
      // No expiry — perpetual
      daysRemaining = -1 // -1 = perpetual
    }

    return { valid, daysRemaining, maxPos: license.maxPos, plan: license.plan }
  }
}
