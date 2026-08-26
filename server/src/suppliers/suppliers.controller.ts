import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { SuppliersService } from './suppliers.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateSupplierDto } from './dto/create-supplier.dto'
import { UpdateSupplierDto } from './dto/update-supplier.dto'
import { MakePaymentDto } from './dto/make-payment.dto'

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private suppliers: SuppliersService) {}

  @ApiOperation({ summary: 'Create a new supplier' })
  @Post()
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliers.create(dto)
  }

  @ApiOperation({ summary: 'Get all suppliers (paginated + filtered)' })
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

  @ApiOperation({ summary: 'Get a supplier by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suppliers.findOne(+id)
  }

  @ApiOperation({ summary: 'Update a supplier' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliers.update(+id, dto)
  }

  @ApiOperation({ summary: 'Deactivate a supplier' })
  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.suppliers.deactivate(+id)
  }

  @ApiOperation({ summary: 'Reactivate a supplier' })
  @Patch(':id/reactivate')
  reactivate(@Param('id') id: string) {
    return this.suppliers.reactivate(+id)
  }

  @ApiOperation({ summary: 'Make payment to supplier (reduce payable balance)' })
  @Post(':id/payments')
  makePayment(@Param('id') id: string, @Body() dto: MakePaymentDto) {
    return this.suppliers.makePayment(+id, dto)
  }

  @ApiOperation({ summary: 'Get supplier ledger / transaction history' })
  @Get(':id/ledger')
  getLedger(@Param('id') id: string) {
    return this.suppliers.getLedger(+id)
  }
}
