import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs'

const execAsync = promisify(exec)

@Injectable()
export class BackupService {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  async createBackup() {
    const backupPath = await this.settings.get('backup_path', './backups/')
    const resolvedPath = path.resolve(backupPath ?? './backups/')

    // Ensure directory exists
    if (!fs.existsSync(resolvedPath)) {
      fs.mkdirSync(resolvedPath, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backup-${timestamp}.sql`
    const filePath = path.join(resolvedPath, filename)

    // Get DB connection details from environment
    const dbUrl = process.env.DATABASE_URL ?? ''
    let dbName = ''
    let dbUser = 'root'
    let dbPass = ''
    let dbHost = 'localhost'
    let dbPort = '3306'

    try {
      // Parse mysql://user:pass@host:port/dbname
      const url = new URL(dbUrl)
      dbUser = url.username
      dbPass = url.password
      dbHost = url.hostname
      dbPort = url.port || '3306'
      dbName = url.pathname.replace('/', '')
    } catch {
      // Fallback if URL parse fails
    }

    const backup = await this.prisma.backup.create({
      data: {
        filename,
        status: 'RUNNING',
        location: filePath,
      },
    })

    try {
      const passFlag = dbPass ? `-p${dbPass}` : ''
      const cmd = `mysqldump -u${dbUser} ${passFlag} -h${dbHost} -P${dbPort} ${dbName} > "${filePath}"`
      await execAsync(cmd)

      const stat = fs.statSync(filePath)
      await this.prisma.backup.update({
        where: { id: backup.id },
        data: { status: 'SUCCESS', size: BigInt(stat.size) },
      })

      return { ...backup, status: 'SUCCESS', size: stat.size, filename, location: filePath }
    } catch (err: any) {
      await this.prisma.backup.update({
        where: { id: backup.id },
        data: { status: 'FAILED' },
      })
      throw new BadRequestException(`Backup failed: ${err.message}`)
    }
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    return this.prisma.$transaction([
      this.prisma.backup.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.backup.count(),
    ])
  }

  async restorePlaceholder(id: number) {
    const backup = await this.prisma.backup.findUnique({ where: { id } })
    if (!backup) throw new BadRequestException('Backup record not found')
    return {
      message: 'Restore requires server restart — contact admin',
      backupId: id,
      filename: backup.filename,
    }
  }
}
