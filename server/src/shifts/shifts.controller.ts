import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ShiftsService } from './shifts.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

@UseGuards(JwtAuthGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private shifts: ShiftsService) {}

  @Post('open')
  open(@Body() body: { openingBalance?: number }, @CurrentUser() user: any) {
    return this.shifts.openShift(user.id, body.openingBalance ?? 0)
  }

  @Get('current')
  getCurrent() {
    return this.shifts.getCurrentShift()
  }

  @Post(':id/close')
  close(
    @Param('id') id: string,
    @Body() body: { closingBalance?: number; notes?: string },
    @CurrentUser() user: any,
  ) {
    return this.shifts.closeShift(+id, user.id, body.closingBalance, body.notes)
  }

  @Get(':id/summary')
  summary(@Param('id') id: string) {
    return this.shifts.getShiftSummary(+id)
  }

  @Get()
  findAll(@Query('page') page: string, @Query('limit') limit: string) {
    return this.shifts.findAll(Number(page) || 1, Number(limit) || 20)
  }
}
