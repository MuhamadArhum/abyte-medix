import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { SalesService } from './sales.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private sales: SalesService) {}

  @Post()
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.sales.createSale({ ...body, userId: user.id })
  }

  @Get()
  findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('customerId') customerId: string,
    @Query('search') search: string,
    @Query('paymentMethod') paymentMethod: string,
    @Query('status') status: string,
  ) {
    return this.sales.findAll(
      Number(page) || 1, Number(limit) || 50,
      from || undefined, to || undefined,
      customerId ? +customerId : undefined,
      search || undefined, paymentMethod || undefined, status || undefined,
    )
  }

  @Get('summary')
  summary(@Query('date') date: string) {
    return this.sales.getDailySummary(date)
  }

  // Hold / Resume
  @Post('hold')
  holdSale(@Body() body: any, @CurrentUser() user: any) {
    return this.sales.holdSale({ ...body, userId: user.id })
  }

  @Get('held')
  getHeldSales(@CurrentUser() user: any, @Query('terminalId') terminalId: string) {
    return this.sales.getHeldSales(user.id, terminalId)
  }

  @Delete('held/:id')
  discardHeldSale(@Param('id') id: string) {
    return this.sales.discardDraft(+id)
  }

  // Quotations
  @Post('quotations')
  saveQuotation(@Body() body: any, @CurrentUser() user: any) {
    return this.sales.saveQuotation({ ...body, userId: user.id })
  }

  @Get('quotations')
  getQuotations() {
    return this.sales.getQuotations()
  }

  @Delete('quotations/:id')
  deleteQuotation(@Param('id') id: string) {
    return this.sales.discardDraft(+id)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sales.findOne(+id)
  }

  @Post(':id/return')
  createReturn(@Param('id') id: string, @Body() body: any) {
    return this.sales.createReturn(+id, body)
  }
}
