import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { PurchasesService } from './purchases.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { CreatePurchaseDto } from './dto/create-purchase.dto'
import { AddPaymentDto } from './dto/add-payment.dto'
import { CreatePurchaseReturnDto } from './dto/create-purchase-return.dto'

@ApiTags('Purchases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private purchases: PurchasesService) {}

  @ApiOperation({ summary: 'Create a new purchase order' })
  @Post()
  create(@Body() dto: CreatePurchaseDto, @CurrentUser() user: any) {
    return this.purchases.create({ ...dto, userId: user?.id })
  }

  @ApiOperation({ summary: 'Get all purchases (paginated + filtered)' })
  @Get()
  findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('supplierId') supplierId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('status') status: string,
    @Query('search') search: string,
  ) {
    return this.purchases.findAll(
      Number(page) || 1,
      Number(limit) || 50,
      supplierId ? +supplierId : undefined,
      from,
      to,
      status || undefined,
      search || undefined,
    )
  }

  @ApiOperation({ summary: 'Get a purchase by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchases.findOne(+id)
  }

  @ApiOperation({ summary: 'Record a payment against a purchase' })
  @Patch(':id/payment')
  addPayment(@Param('id') id: string, @Body() dto: AddPaymentDto) {
    return this.purchases.addPayment(+id, dto.amount)
  }

  @ApiOperation({ summary: 'Create a purchase return' })
  @Post(':id/return')
  createReturn(@Param('id') id: string, @Body() dto: CreatePurchaseReturnDto, @CurrentUser() user: any) {
    return this.purchases.createReturn(+id, { ...dto, userId: user?.id })
  }
}
