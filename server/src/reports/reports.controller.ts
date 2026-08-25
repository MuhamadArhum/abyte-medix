import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ReportsService } from './reports.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { Role } from '@prisma/client'

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('sales')
  salesByPeriod(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('groupBy') groupBy: 'day' | 'month',
  ) {
    return this.reports.salesByPeriod(from, to, groupBy || 'day')
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('sales/by-product')
  salesByProduct(@Query('from') from: string, @Query('to') to: string) {
    return this.reports.salesByProduct(from, to)
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('sales/by-customer')
  salesByCustomer(@Query('from') from: string, @Query('to') to: string) {
    return this.reports.salesByCustomer(from, to)
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('purchases')
  purchasesByPeriod(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('groupBy') groupBy: 'day' | 'month',
  ) {
    return this.reports.purchasesByPeriod(from, to, groupBy || 'day')
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('purchases/by-supplier')
  purchasesBySupplier(@Query('from') from: string, @Query('to') to: string) {
    return this.reports.purchasesBySupplier(from, to)
  }

  @Get('inventory/valuation')
  inventoryValuation() {
    return this.reports.inventoryValuation()
  }

  @Get('inventory/movements')
  inventoryMovements(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('type') type: string,
  ) {
    return this.reports.inventoryMovements(from, to, type)
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('profit-loss')
  profitLoss(@Query('from') from: string, @Query('to') to: string) {
    return this.reports.profitLoss(from, to)
  }
}
