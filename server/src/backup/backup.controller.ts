import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { BackupService } from './backup.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { Role } from '@prisma/client'

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('backup')
export class BackupController {
  constructor(private backup: BackupService) {}

  @Post()
  create() {
    return this.backup.createBackup()
  }

  @Get()
  findAll(@Query('page') page: string, @Query('limit') limit: string) {
    return this.backup.findAll(Number(page) || 1, Number(limit) || 20)
  }

  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.backup.restorePlaceholder(+id)
  }
}
