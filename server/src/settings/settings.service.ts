import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

// Default settings (document only — not auto-seeded):
// invoice_prefix: "INV"
// low_stock_threshold: "10"
// expiry_alert_days: "90"
// store_name: "My Medical Store"
// currency: "Rs."
// backup_path: "./backups/"

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getAll(): Promise<Record<string, string>> {
    const settings = await this.prisma.setting.findMany()
    return settings.reduce<Record<string, string>>((acc, s) => {
      acc[s.key] = s.value
      return acc
    }, {})
  }

  async get(key: string, defaultValue?: string): Promise<string | undefined> {
    const setting = await this.prisma.setting.findUnique({ where: { key } })
    return setting?.value ?? defaultValue
  }

  async getOne(key: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key } })
    return { key, value: setting?.value ?? null }
  }

  async upsertMany(data: Record<string, string>) {
    const results = await Promise.all(
      Object.entries(data).map(([key, value]) =>
        this.prisma.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        }),
      ),
    )
    return results
  }
}
