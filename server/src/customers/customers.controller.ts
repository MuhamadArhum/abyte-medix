import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { CustomersService } from './customers.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateCustomerDto } from './dto/create-customer.dto'
import { UpdateCustomerDto } from './dto/update-customer.dto'
import { ReceivePaymentDto } from './dto/receive-payment.dto'

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private customers: CustomersService) {}

  @ApiOperation({ summary: 'Create a new customer' })
  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.customers.create(dto)
  }

  @ApiOperation({ summary: 'Get all customers (paginated + filtered)' })
  @Get()
  findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Query('isActive') isActive: string,
    @Query('hasBalance') hasBalance: string,
  ) {
    const activeFilter = isActive === 'true' ? true : isActive === 'false' ? false : undefined
    const balanceFilter = hasBalance === 'true' ? true : hasBalance === 'false' ? false : undefined
    return this.customers.findAll(Number(page) || 1, Number(limit) || 50, search, activeFilter, balanceFilter)
  }

  @ApiOperation({ summary: 'Get a customer by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customers.findOne(+id)
  }

  @ApiOperation({ summary: 'Update a customer' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(+id, dto)
  }

  @ApiOperation({ summary: 'Deactivate a customer' })
  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.customers.deactivate(+id)
  }

  @ApiOperation({ summary: 'Reactivate a customer' })
  @Patch(':id/reactivate')
  reactivate(@Param('id') id: string) {
    return this.customers.reactivate(+id)
  }

  @ApiOperation({ summary: 'Receive payment from customer (reduce outstanding balance)' })
  @Post(':id/payments')
  receivePayment(@Param('id') id: string, @Body() dto: ReceivePaymentDto) {
    return this.customers.receivePayment(+id, dto)
  }

  @ApiOperation({ summary: 'Get customer ledger / transaction history' })
  @Get(':id/ledger')
  getLedger(@Param('id') id: string) {
    return this.customers.getLedger(+id)
  }

  @ApiOperation({ summary: 'Check if customer has enough credit for a given amount' })
  @Get(':id/credit-check')
  creditCheck(@Param('id') id: string, @Query('amount') amount: string) {
    return this.customers.creditCheck(+id, Number(amount) || 0)
  }
}
