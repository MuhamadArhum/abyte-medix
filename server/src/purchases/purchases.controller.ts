import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { PurchasesService } from './purchases.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'

@UseGuards(JwtAuthGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private purchases: PurchasesService) {}

  @Post()
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.purchases.create({ ...body, userId: user?.id })
  }

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchases.findOne(+id)
  }

  @Patch(':id/payment')
  addPayment(@Param('id') id: string, @Body() body: { amount: number }) {
    return this.purchases.addPayment(+id, Number(body.amount))
  }

  @Post(':id/return')
  createReturn(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.purchases.createReturn(+id, { ...body, userId: user?.id })
  }
}
