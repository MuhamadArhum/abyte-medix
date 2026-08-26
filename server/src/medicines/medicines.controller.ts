import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { MedicinesService } from './medicines.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateMedicineDto } from './dto/create-medicine.dto'
import { UpdateMedicineDto } from './dto/update-medicine.dto'

@ApiTags('Medicines')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('medicines')
export class MedicinesController {
  constructor(private medicines: MedicinesService) {}

  @ApiOperation({ summary: 'Search medicines by name or code' })
  @Get('search')
  search(@Query('q') q: string) {
    return this.medicines.search(q ?? '')
  }

  @ApiOperation({ summary: 'Get medicines below reorder level' })
  @Get('low-stock')
  lowStock() {
    return this.medicines.getLowStock()
  }

  @ApiOperation({ summary: 'Get batches expiring within N days' })
  @Get('expiring')
  expiring(@Query('days') days: string) {
    return this.medicines.getExpiringBatches(Number(days) || 90)
  }

  @ApiOperation({ summary: 'Get all medicines (paginated)' })
  @Get()
  findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Query('categoryId') categoryId: string,
    @Query('manufacturerId') manufacturerId: string,
    @Query('prescriptionRequired') prescriptionRequired: string,
    @Query('isActive') isActive: string,
  ) {
    return this.medicines.findAll(
      Number(page) || 1,
      Number(limit) || 50,
      search || undefined,
      categoryId ? Number(categoryId) : undefined,
      manufacturerId ? Number(manufacturerId) : undefined,
      prescriptionRequired !== undefined && prescriptionRequired !== '' ? prescriptionRequired === 'true' : undefined,
      isActive !== undefined && isActive !== '' ? isActive === 'true' : undefined,
    )
  }

  @ApiOperation({ summary: 'Get a medicine by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.medicines.findOne(+id)
  }

  @ApiOperation({ summary: 'Create a new medicine' })
  @Post()
  create(@Body() dto: CreateMedicineDto) {
    return this.medicines.create(dto)
  }

  @ApiOperation({ summary: 'Update a medicine' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMedicineDto) {
    return this.medicines.update(+id, dto)
  }

  @ApiOperation({ summary: 'Deactivate (soft-delete) a medicine' })
  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.medicines.deactivate(+id)
  }
}
