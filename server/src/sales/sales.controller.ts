import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { SalesService } from './sales.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { CreateSaleDto } from './dto/create-sale.dto'
import { HoldSaleDto } from './dto/hold-sale.dto'
import { CreateSaleReturnDto } from './dto/create-sale-return.dto'

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private sales: SalesService) {}

  @ApiOperation({ summary: 'Create a completed sale (POS checkout)' })
  @Post()
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: any) {
    return this.sales.createSale({ ...dto, userId: user.id })
  }

  @ApiOperation({ summary: 'Get all sales (paginated + filtered)' })
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

  @ApiOperation({ summary: 'Get daily sales summary' })
  @Get('summary')
  summary(@Query('date') date: string) {
    return this.sales.getDailySummary(date)
  }

  @ApiOperation({ summary: 'Hold (pause) a sale' })
  @Post('hold')
  holdSale(@Body() dto: HoldSaleDto, @CurrentUser() user: any) {
    return this.sales.holdSale({ ...dto, userId: user.id })
  }

  @ApiOperation({ summary: 'Get held sales for current terminal' })
  @Get('held')
  getHeldSales(@CurrentUser() user: any, @Query('terminalId') terminalId: string) {
    return this.sales.getHeldSales(user.id, terminalId)
  }

  @ApiOperation({ summary: 'Discard a held sale' })
  @Delete('held/:id')
  discardHeldSale(@Param('id') id: string) {
    return this.sales.discardDraft(+id)
  }

  @ApiOperation({ summary: 'Save a quotation' })
  @Post('quotations')
  saveQuotation(@Body() dto: HoldSaleDto, @CurrentUser() user: any) {
    return this.sales.saveQuotation({ ...dto, userId: user.id })
  }

  @ApiOperation({ summary: 'Get all quotations' })
  @Get('quotations')
  getQuotations() {
    return this.sales.getQuotations()
  }

  @ApiOperation({ summary: 'Delete a quotation' })
  @Delete('quotations/:id')
  deleteQuotation(@Param('id') id: string) {
    return this.sales.discardDraft(+id)
  }

  @ApiOperation({ summary: 'Get a sale by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sales.findOne(+id)
  }

  @ApiOperation({ summary: 'Create a sale return' })
  @Post(':id/return')
  createReturn(@Param('id') id: string, @Body() dto: CreateSaleReturnDto) {
    return this.sales.createReturn(+id, dto)
  }
}
