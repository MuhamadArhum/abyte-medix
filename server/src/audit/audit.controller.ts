import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AuditService } from './audit.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { Role } from '@prisma/client'

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('audit')
export class AuditController {
  constructor(private audit: AuditService) {}

  @ApiOperation({ summary: 'Get audit log (paginated + filtered by user/module/date)' })
  @Get()
  findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('userId') userId: string,
    @Query('module') module: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.audit.findAll(
      Number(page) || 1,
      Number(limit) || 50,
      userId ? +userId : undefined,
      module,
      from,
      to,
    )
  }
}
