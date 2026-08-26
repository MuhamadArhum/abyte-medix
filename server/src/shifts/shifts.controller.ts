import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ShiftsService } from './shifts.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { OpenShiftDto } from './dto/open-shift.dto'
import { CloseShiftDto } from './dto/close-shift.dto'

@ApiTags('Shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private shifts: ShiftsService) {}

  @ApiOperation({ summary: 'Open a new shift' })
  @Post('open')
  open(@Body() dto: OpenShiftDto, @CurrentUser() user: any) {
    return this.shifts.openShift(user.id, dto.openingBalance ?? 0)
  }

  @ApiOperation({ summary: 'Get the currently active shift' })
  @Get('current')
  getCurrent() {
    return this.shifts.getCurrentShift()
  }

  @ApiOperation({ summary: 'Close a shift and record closing balance' })
  @Post(':id/close')
  close(@Param('id') id: string, @Body() dto: CloseShiftDto, @CurrentUser() user: any) {
    return this.shifts.closeShift(+id, user.id, dto.closingBalance, dto.notes)
  }

  @ApiOperation({ summary: 'Get shift summary (sales, cash collected, etc.)' })
  @Get(':id/summary')
  summary(@Param('id') id: string) {
    return this.shifts.getShiftSummary(+id)
  }

  @ApiOperation({ summary: 'Get all shifts (paginated)' })
  @Get()
  findAll(@Query('page') page: string, @Query('limit') limit: string) {
    return this.shifts.findAll(Number(page) || 1, Number(limit) || 20)
  }
}
