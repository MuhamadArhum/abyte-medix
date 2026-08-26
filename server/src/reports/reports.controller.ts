import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ReportsService } from './reports.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { Role } from '@prisma/client'

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @ApiOperation({ summary: 'Sales report grouped by day or month' })
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

  @ApiOperation({ summary: 'Sales breakdown by product/medicine' })
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('sales/by-product')
  salesByProduct(@Query('from') from: string, @Query('to') to: string) {
    return this.reports.salesByProduct(from, to)
  }

  @ApiOperation({ summary: 'Sales breakdown by customer' })
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('sales/by-customer')
  salesByCustomer(@Query('from') from: string, @Query('to') to: string) {
    return this.reports.salesByCustomer(from, to)
  }

  @ApiOperation({ summary: 'Purchases report grouped by day or month' })
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

  @ApiOperation({ summary: 'Purchases breakdown by supplier' })
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('purchases/by-supplier')
  purchasesBySupplier(@Query('from') from: string, @Query('to') to: string) {
    return this.reports.purchasesBySupplier(from, to)
  }

  @ApiOperation({ summary: 'Current inventory valuation' })
  @Get('inventory/valuation')
  inventoryValuation() {
    return this.reports.inventoryValuation()
  }

  @ApiOperation({ summary: 'Inventory movement history by date range and type' })
  @Get('inventory/movements')
  inventoryMovements(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('type') type: string,
  ) {
    return this.reports.inventoryMovements(from, to, type)
  }

  @ApiOperation({ summary: 'Profit and loss report for date range' })
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Get('profit-loss')
  profitLoss(@Query('from') from: string, @Query('to') to: string) {
    return this.reports.profitLoss(from, to)
  }
}
