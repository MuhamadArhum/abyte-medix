import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as crypto from 'crypto'

const PLAN_MAP: Record<string, string> = { B: 'BASIC', S: 'STANDARD', P: 'PREMIUM' }

interface LicensePayload {
  n: string  // storeName
  p: string  // plan code B/S/P
  m: number  // maxPos
  e: string  // expiry YYYY-MM-DD or ''
}

@Injectable()
export class LicenseService {
  constructor(private prisma: PrismaService) {}

  private get secret(): string {
    return process.env.LICENSE_SECRET || 'abyte-medix-license-secret-@2025#do-not-share'
  }

  private decodeKey(licenseKey: string): { payload: LicensePayload; valid: boolean } {
    try {
      if (!licenseKey.startsWith('MEDIX-')) throw new Error('Invalid prefix')
      const encoded = licenseKey.slice(6)
      const combined = Buffer.from(encoded, 'base64url').toString('utf8')
      const lastDot = combined.lastIndexOf('.')
      if (lastDot === -1) throw new Error('Invalid structure')

      const jsonStr = combined.slice(0, lastDot)
      const providedHmac = combined.slice(lastDot + 1)
      const expectedHmac = crypto.createHmac('sha256', this.secret).update(jsonStr).digest('hex').slice(0, 16)

      const valid = providedHmac === expectedHmac
      const payload = JSON.parse(jsonStr) as LicensePayload
      return { payload, valid }
    } catch {
      return { payload: { n: '', p: '', m: 0, e: '' }, valid: false }
    }
  }

  async getLicense() {
    return this.prisma.license.findFirst({ orderBy: { createdAt: 'desc' } })
  }

  async activate(dto: { licenseKey: string }) {
    const { licenseKey } = dto
    if (!licenseKey?.trim()) throw new BadRequestException('License key is required')

    const { payload, valid } = this.decodeKey(licenseKey.trim())

    if (!valid) {
      throw new BadRequestException(
        'Invalid license key. Please check that you copied the full key correctly.'
      )
    }

    if (!payload.n || !payload.p || !payload.m) {
      throw new BadRequestException('License key is missing required data.')
    }

    const plan = PLAN_MAP[payload.p] ?? payload.p
    const expiryDate = payload.e ? new Date(payload.e) : null

    // Check if already expired
    if (expiryDate && expiryDate < new Date()) {
      throw new BadRequestException(
        `This license key has already expired (${payload.e}). Please contact support for a new key.`
      )
    }

    return this.prisma.license.upsert({
      where: { licenseKey: licenseKey.trim() },
      update: {
        storeName: payload.n,
        plan,
        maxPos: payload.m,
        expiryDate,
        status: 'ACTIVE',
        activationDate: new Date(),
        lastValidatedAt: new Date(),
      },
      create: {
        licenseKey: licenseKey.trim(),
        storeName: payload.n,
        plan,
        maxPos: payload.m,
        expiryDate,
        status: 'ACTIVE',
        activationDate: new Date(),
        lastValidatedAt: new Date(),
      },
    })
  }

  async getStatus() {
    const license = await this.getLicense()
    if (!license) {
      return { valid: false, daysRemaining: 0, maxPos: 0, plan: null, message: 'No license found', storeName: null }
    }

    const now = new Date()
    let valid = license.status === 'ACTIVE'
    let daysRemaining = -1

    if (license.expiryDate) {
      const diff = license.expiryDate.getTime() - now.getTime()
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
      if (daysRemaining === 0) valid = false
    }

    const message = !valid
      ? (daysRemaining === 0 ? 'License expired' : 'License inactive')
      : daysRemaining === -1
        ? 'Active — No expiry'
        : daysRemaining <= 30
          ? `Expiring in ${daysRemaining} day(s)`
          : 'License valid'

    return {
      valid,
      daysRemaining,
      maxPos: license.maxPos,
      plan: license.plan,
      storeName: license.storeName,
      message,
    }
  }
}
