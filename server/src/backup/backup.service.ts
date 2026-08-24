import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as path from 'path'
import * as fs from 'fs'

@Injectable()
export class BackupService {
  constructor(private prisma: PrismaService) {}

  private getDbFilePath(): string {
    const dbUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'
    // Parse SQLite file path from "file:./path/to/db.db" or "file:../path/db.db"
    const filePath = dbUrl.replace(/^file:/, '')
    return path.resolve(process.cwd(), filePath)
  }

  private getBackupDir(): string {
    const dir = path.resolve(process.cwd(), 'backups')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    return dir
  }

  async createBackup() {
    const dbFile = this.getDbFilePath()
    if (!fs.existsSync(dbFile)) {
      throw new BadRequestException(`Database file not found: ${dbFile}`)
    }

    const backupDir = this.getBackupDir()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backup-${timestamp}.db`
    const filePath = path.join(backupDir, filename)

    const record = await this.prisma.backup.create({
      data: { filename, status: 'RUNNING', location: filePath },
    })

    try {
      fs.copyFileSync(dbFile, filePath)
      const size = fs.statSync(filePath).size

      await this.prisma.backup.update({
        where: { id: record.id },
        data: { status: 'SUCCESS', size: BigInt(size) },
      })

      return { ...record, status: 'SUCCESS', size, filename, location: filePath }
    } catch (err: any) {
      await this.prisma.backup.update({
        where: { id: record.id },
        data: { status: 'FAILED' },
      })
      throw new BadRequestException(`Backup failed: ${err.message}`)
    }
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [data, total] = await this.prisma.$transaction([
      this.prisma.backup.findMany({
        skip, take: limit, orderBy: { createdAt: 'desc' },
      }),
      this.prisma.backup.count(),
    ])
    return { data, total }
  }

  async restore(id: number) {
    const backup = await this.prisma.backup.findUnique({ where: { id } })
    if (!backup) throw new NotFoundException('Backup record not found')
    if (backup.status !== 'SUCCESS') {
      throw new BadRequestException('Cannot restore from a failed or running backup')
    }
    if (!backup.location || !fs.existsSync(backup.location)) {
      throw new BadRequestException(`Backup file not found on disk: ${backup.filename}`)
    }

    const dbFile = this.getDbFilePath()

    try {
      // Copy backup over the current database file
      fs.copyFileSync(backup.location, dbFile)
      return {
        success: true,
        message: `Database restored from ${backup.filename}`,
        backupId: id,
        filename: backup.filename,
        restoredAt: new Date().toISOString(),
      }
    } catch (err: any) {
      throw new BadRequestException(`Restore failed: ${err.message}`)
    }
  }
}
