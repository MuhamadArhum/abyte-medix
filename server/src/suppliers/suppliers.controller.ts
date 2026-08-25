import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { SuppliersService } from './suppliers.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private suppliers: SuppliersService) {}

  @Post()
  create(@Body() body: any) {
    return this.suppliers.create(body)
  }

  @Get()
  findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Query('isActive') isActive: string,
    @Query('hasPayable') hasPayable: string,
  ) {
    const activeFilter = isActive === 'true' ? true : isActive === 'false' ? false : undefined
    const payableFilter = hasPayable === 'true' ? true : hasPayable === 'false' ? false : undefined
    return this.suppliers.findAll(Number(page) || 1, Number(limit) || 50, search, activeFilter, payableFilter)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliers.findOne(+id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.suppliers.update(+id, body)
  }

  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.suppliers.deactivate(+id)
  }

  @Patch(':id/reactivate')
  reactivate(@Param('id') id: string) {
    return this.suppliers.reactivate(+id)
  }

  @Post(':id/payments')
  makePayment(@Param('id') id: string, @Body() body: any) {
    return this.suppliers.makePayment(+id, body)
  }

  @Get(':id/ledger')
  getLedger(@Param('id') id: string) {
    return this.suppliers.getLedger(+id)
  }
}
