import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { CustomersService } from './customers.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private customers: CustomersService) {}

  @Post()
  create(@Body() body: any) {
    return this.customers.create(body)
  }

  @Get()
  findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
  ) {
    return this.customers.findAll(Number(page) || 1, Number(limit) || 50, search)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customers.findOne(+id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.customers.update(+id, body)
  }

  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.customers.deactivate(+id)
  }

  @Get(':id/ledger')
  getLedger(@Param('id') id: string) {
    return this.customers.getLedger(+id)
  }

  @Get(':id/credit-check')
  creditCheck(@Param('id') id: string, @Query('amount') amount: string) {
    return this.customers.creditCheck(+id, Number(amount) || 0)
  }
}
