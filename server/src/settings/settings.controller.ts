import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { SettingsService } from './settings.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { Role } from '@prisma/client'

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @ApiOperation({ summary: 'Get all settings as key-value pairs' })
  @Get()
  getAll() {
    return this.settings.getAll()
  }

  @ApiOperation({ summary: 'Upsert multiple settings at once' })
  @Patch()
  upsertMany(@Body() body: Record<string, string>) {
    return this.settings.upsertMany(body)
  }

  @ApiOperation({ summary: 'Get a single setting by key' })
  @Get(':key')
  getOne(@Param('key') key: string) {
    return this.settings.getOne(key)
  }
}
