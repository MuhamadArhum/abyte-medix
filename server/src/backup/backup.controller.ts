import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { BackupService } from './backup.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { Role } from '@prisma/client'

@ApiTags('Backup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('backup')
export class BackupController {
  constructor(private backup: BackupService) {}

  @ApiOperation({ summary: 'Create a new database backup' })
  @Post()
  create() {
    return this.backup.createBackup()
  }

  @ApiOperation({ summary: 'Get all backups (paginated)' })
  @Get()
  findAll(@Query('page') page: string, @Query('limit') limit: string) {
    return this.backup.findAll(Number(page) || 1, Number(limit) || 20)
  }

  @ApiOperation({ summary: 'Restore database from a backup' })
  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.backup.restore(+id)
  }
}
