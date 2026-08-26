import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { InventoryService } from './inventory.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { Role } from '@prisma/client'
import { AdjustmentDto } from './dto/adjustment.dto'

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inventory: InventoryService) {}

  @ApiOperation({ summary: 'Get current stock levels (paginated + filtered)' })
  @Get()
  getStock(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Query('filter') filter: string,
    @Query('expiryDays') expiryDays: string,
    @Query('categoryId') categoryId: string,
    @Query('manufacturerId') manufacturerId: string,
    @Query('sort') sort: string,
  ) {
    return this.inventory.getStock(
      Number(page) || 1,
      Number(limit) || 25,
      search ?? '',
      filter ?? '',
      Number(expiryDays) || 90,
      categoryId ? Number(categoryId) : undefined,
      manufacturerId ? Number(manufacturerId) : undefined,
      sort || 'name_asc',
    )
  }

  @ApiOperation({ summary: 'Get stock movement history' })
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

  @ApiOperation({ summary: 'Adjust stock (damage, write-off, manual correction)' })
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('adjustment')
  adjustment(@Body() dto: AdjustmentDto) {
    return this.inventory.adjustment(dto)
  }

  @ApiOperation({ summary: 'Get batches for a specific medicine' })
  @Get('batches/:medicineId')
  getBatches(@Param('medicineId') medicineId: string) {
    return this.inventory.getBatchesByMedicine(+medicineId)
  }
}
