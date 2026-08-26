import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs'

const execAsync = promisify(exec)

// Common mysqldump locations on Windows (MySQL + MariaDB)
const MYSQLDUMP_PATHS = [
  'mysqldump',
  // MariaDB
  'C:\\Program Files\\MariaDB 12.3\\bin\\mysqldump.exe',
  'C:\\Program Files\\MariaDB 12.2\\bin\\mysqldump.exe',
  'C:\\Program Files\\MariaDB 12.1\\bin\\mysqldump.exe',
  'C:\\Program Files\\MariaDB 11.4\\bin\\mysqldump.exe',
  'C:\\Program Files\\MariaDB 11.2\\bin\\mysqldump.exe',
  'C:\\Program Files\\MariaDB 10.11\\bin\\mysqldump.exe',
  'C:\\Program Files\\MariaDB 10.6\\bin\\mysqldump.exe',
  // MySQL
  'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe',
  'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqldump.exe',
  'C:\\Program Files\\MySQL\\MySQL Server 5.7\\bin\\mysqldump.exe',
  'C:\\xampp\\mysql\\bin\\mysqldump.exe',
  'C:\\wamp64\\bin\\mysql\\mysql8.0\\bin\\mysqldump.exe',
  'C:\\laragon\\bin\\mysql\\mysql-8.0\\bin\\mysqldump.exe',
]

@Injectable()
export class BackupService {
  constructor(private prisma: PrismaService) {}

  private async getBackupDir(): Promise<string> {
    const setting = await this.prisma.setting.findUnique({ where: { key: 'backup_path' } })
    const customPath = setting?.value?.trim()
    const dir = customPath ? path.resolve(customPath) : path.resolve(process.cwd(), 'backups')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    return dir
  }

  private parseDbUrl(): { user: string; pass: string; host: string; port: string; name: string } {
    const dbUrl = process.env.DATABASE_URL ?? ''
    try {
      const url = new URL(dbUrl)
      return {
        user: url.username || 'root',
        pass: url.password || '',
        host: url.hostname || 'localhost',
        port: url.port || '3306',
        name: url.pathname.replace(/^\//, ''),
      }
    } catch {
      return { user: 'root', pass: '', host: 'localhost', port: '3306', name: '' }
    }
  }

  private async findMysqldump(): Promise<string> {
    for (const candidate of MYSQLDUMP_PATHS) {
      try {
        await execAsync(`"${candidate}" --version`)
        return candidate
      } catch {
        // not found at this path, try next
      }
    }
    throw new BadRequestException(
      'mysqldump not found. Make sure MySQL or MariaDB is installed. ' +
      'Expected at: C:\\Program Files\\MariaDB 12.x\\bin\\mysqldump.exe or C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe. ' +
      'You can also add mysqldump to your system PATH.'
    )
  }

  async createBackup() {
    const { user, pass, host, port, name } = this.parseDbUrl()
    if (!name) throw new BadRequestException('Could not determine database name from DATABASE_URL')

    const backupDir = await this.getBackupDir()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `backup-${timestamp}.sql`
    const filePath = path.join(backupDir, filename)

    const record = await this.prisma.backup.create({
      data: { filename, status: 'RUNNING', location: filePath },
    })

    try {
      const mysqldump = await this.findMysqldump()
      const passFlag = pass ? `--password="${pass}"` : ''
      const cmd = `"${mysqldump}" -u"${user}" ${passFlag} -h"${host}" -P${port} --single-transaction --routines "${name}"`

      const { stdout } = await execAsync(cmd, { maxBuffer: 100 * 1024 * 1024 })
      fs.writeFileSync(filePath, stdout, 'utf8')

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
      }).catch(() => {})
      throw new BadRequestException(err.message ?? 'Backup failed')
    }
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [data, total] = await this.prisma.$transaction([
      this.prisma.backup.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
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

    const { user, pass, host, port, name } = this.parseDbUrl()
    if (!name) throw new BadRequestException('Could not determine database name from DATABASE_URL')

    try {
      const mysqlBin = (await this.findMysqldump()).replace('mysqldump', 'mysql')
      const passFlag = pass ? `--password="${pass}"` : ''
      const content = fs.readFileSync(backup.location, 'utf8')
      const cmd = `"${mysqlBin}" -u"${user}" ${passFlag} -h"${host}" -P${port} "${name}"`
      const child = await execAsync(cmd, { input: content } as any)
      return {
        success: true,
        message: `Database restored from ${backup.filename}`,
        backupId: id,
        restoredAt: new Date().toISOString(),
      }
    } catch (err: any) {
      throw new BadRequestException(`Restore failed: ${err.message ?? err.stderr}`)
    }
  }
}
