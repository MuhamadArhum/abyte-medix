import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { InventoryService } from './inventory.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { Role } from '@prisma/client'

@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inventory: InventoryService) {}

  @Get()
  getStock() {
    return this.inventory.getStock()
  }

  @Get('movements')
  getMovements(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('batchId') batchId: string,
    @Query('medicineId') medicineId: string,
    @Query('type') type: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.inventory.getMovements(
      Number(page) || 1,
      Number(limit) || 50,
      batchId ? +batchId : undefined,
      medicineId ? +medicineId : undefined,
      type as any,
      from,
      to,
    )
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('adjustment')
  adjustment(@Body() body: any) {
    return this.inventory.adjustment(body)
  }

  @Get('batches/:medicineId')
  getBatches(@Param('medicineId') medicineId: string) {
    return this.inventory.getBatchesByMedicine(+medicineId)
  }
}
