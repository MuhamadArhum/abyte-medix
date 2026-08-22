import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { PurchasesService } from './purchases.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private purchases: PurchasesService) {}

  @Post()
  create(@Body() body: any) {
    return this.purchases.create(body)
  }

  @Get()
  findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('supplierId') supplierId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.purchases.findAll(
      Number(page) || 1,
      Number(limit) || 50,
      supplierId ? +supplierId : undefined,
      from,
      to,
    )
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.purchases.findOne(+id)
  }

  @Post(':id/return')
  createReturn(@Param('id') id: string, @Body() body: any) {
    return this.purchases.createReturn(+id, body)
  }
}
