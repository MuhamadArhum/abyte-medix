import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'
import { LicenseService } from './license.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { Role } from '@prisma/client'

class ActivateLicenseDto {
  @ApiProperty({ example: 'XXXX-XXXX-XXXX-XXXX' })
  @IsString()
  licenseKey: string
}

@ApiTags('License')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('license')
export class LicenseController {
  constructor(private license: LicenseService) {}

  @ApiOperation({ summary: 'Get current license info' })
  @Get()
  getLicense() {
    return this.license.getLicense()
  }

  @ApiOperation({ summary: 'Activate license with a key' })
  @Post('activate')
  activate(@Body() dto: ActivateLicenseDto) {
    return this.license.activate(dto)
  }

  @ApiOperation({ summary: 'Check current license status' })
  @Get('status')
  getStatus() {
    return this.license.getStatus()
  }
}
