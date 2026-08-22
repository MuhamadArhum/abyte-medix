import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import { AccountsService } from './accounts.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { Role, PaymentType } from '@prisma/client'

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('accounts')
export class AccountsController {
  constructor(private accounts: AccountsService) {}

  @Post('expenses')
  createExpense(@Body() body: any) {
    return this.accounts.createExpense(body)
  }

  @Get('expenses')
  findExpenses(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.accounts.findExpenses(Number(page) || 1, Number(limit) || 50, from, to)
  }

  @Post('income')
  createIncome(@Body() body: any) {
    return this.accounts.createIncome(body)
  }

  @Get('income')
  findIncome(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.accounts.findIncome(Number(page) || 1, Number(limit) || 50, from, to)
  }

  @Post('payments')
  createPayment(@Body() body: any) {
    return this.accounts.createPayment(body)
  }

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

  @Get('summary')
  getSummary(@Query('from') from: string, @Query('to') to: string) {
    return this.accounts.getSummary(from, to)
  }

  @Get('cash-report')
  getCashReport(@Query('date') date: string) {
    return this.accounts.getCashReport(date)
  }
}
