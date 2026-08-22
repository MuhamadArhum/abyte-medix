import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common'
import { SettingsService } from './settings.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { Role } from '@prisma/client'

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get()
  getAll() {
    return this.settings.getAll()
  }

  @Patch()
  upsertMany(@Body() body: Record<string, string>) {
    return this.settings.upsertMany(body)
  }

  @Get(':key')
  getOne(@Param('key') key: string) {
    return this.settings.getOne(key)
  }
}
