import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import * as bcrypt from 'bcryptjs'

async function main() {
  const url = process.env.DATABASE_URL ?? ''
  const parsed = new URL(url)

  const adapter = new PrismaMariaDb({
    host: parsed.hostname,
    port: parseInt(parsed.port || '3306'),
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.replace('/', ''),
    connectionLimit: 5,
  })

  const prisma = new PrismaClient({ adapter })

  const hash = await bcrypt.hash('admin123', 12)
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: hash,
      fullName: 'Administrator',
      role: 'ADMIN',
    },
  })
  console.log('✅ Admin user created:', user.username, '| Password: admin123')

  await prisma.setting.createMany({
    data: [
      { key: 'store_name', value: 'AbyteMedix Medical Store' },
      { key: 'invoice_prefix', value: 'INV' },
      { key: 'currency', value: 'Rs.' },
      { key: 'low_stock_threshold', value: '10' },
      { key: 'expiry_alert_days', value: '90' },
      { key: 'backup_path', value: './backups/' },
    ],
    skipDuplicates: true,
  })
  console.log('✅ Default settings seeded')

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
