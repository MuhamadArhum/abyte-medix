import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { LicenseService } from './license.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { Role } from '@prisma/client'

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('license')
export class LicenseController {
  constructor(private license: LicenseService) {}

  @Get()
  getLicense() {
    return this.license.getLicense()
  }

  @Post('activate')
  activate(@Body() body: any) {
    return this.license.activate(body)
  }

  @Get('status')
  getStatus() {
    return this.license.getStatus()
  }
}
