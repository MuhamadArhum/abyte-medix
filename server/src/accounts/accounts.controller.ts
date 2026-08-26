import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AccountsService } from './accounts.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Role, PaymentType } from '@prisma/client'
import { CreateExpenseDto } from './dto/create-expense.dto'
import { CreateIncomeDto } from './dto/create-income.dto'
import { CreatePaymentDto } from './dto/create-payment.dto'

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('accounts')
export class AccountsController {
  constructor(private accounts: AccountsService) {}

  @ApiOperation({ summary: 'Record an expense' })
  @Post('expenses')
  createExpense(@Body() dto: CreateExpenseDto, @CurrentUser() user: any) {
    return this.accounts.createExpense(dto, user?.id)
  }

  @ApiOperation({ summary: 'Get all expenses (paginated + date filtered)' })
  @Get('expenses')
  findExpenses(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.accounts.findExpenses(Number(page) || 1, Number(limit) || 50, from, to)
  }

  @ApiOperation({ summary: 'Record an income entry' })
  @Post('income')
  createIncome(@Body() dto: CreateIncomeDto, @CurrentUser() user: any) {
    return this.accounts.createIncome(dto, user?.id)
  }

  @ApiOperation({ summary: 'Get all income entries (paginated + date filtered)' })
  @Get('income')
  findIncome(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.accounts.findIncome(Number(page) || 1, Number(limit) || 50, from, to)
  }

  @ApiOperation({ summary: 'Create a payment record (customer receipt or supplier payment)' })
  @Post('payments')
  createPayment(@Body() dto: CreatePaymentDto, @CurrentUser() user: any) {
    return this.accounts.createPayment({ ...dto, userId: user?.id })
  }

  @ApiOperation({ summary: 'Get all payment records (paginated + filtered)' })
  @Get('payments')
  findPayments(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('type') type: string,
    @Query('customerId') customerId: string,
    @Query('supplierId') supplierId: string,
  ) {
    return this.accounts.findPayments(
      Number(page) || 1,
      Number(limit) || 50,
      type as PaymentType,
      customerId ? +customerId : undefined,
      supplierId ? +supplierId : undefined,
    )
  }

  @ApiOperation({ summary: 'Get income vs expense summary for date range' })
  @Get('summary')
  getSummary(@Query('from') from: string, @Query('to') to: string) {
    return this.accounts.getSummary(from, to)
  }

  @ApiOperation({ summary: 'Get daily cash flow report' })
  @Get('cash-report')
  getCashReport(@Query('date') date: string) {
    return this.accounts.getCashReport(date)
  }
}
