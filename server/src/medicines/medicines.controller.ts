import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { MedicinesService } from './medicines.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('medicines')
export class MedicinesController {
  constructor(private medicines: MedicinesService) {}

  @Get('search')
  search(@Query('q') q: string) {
    return this.medicines.search(q ?? '')
  }

  @Get('low-stock')
  lowStock() {
    return this.medicines.getLowStock()
  }

  @Get('expiring')
  expiring(@Query('days') days: string) {
    return this.medicines.getExpiringBatches(Number(days) || 90)
  }

  @Get()
  findAll(@Query('page') page: string, @Query('limit') limit: string, @Query('search') search: string) {
    return this.medicines.findAll(Number(page) || 1, Number(limit) || 50, search)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.medicines.findOne(+id)
  }

  @Post()
  create(@Body() body: any) {
    return this.medicines.create(body)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.medicines.update(+id, body)
  }

  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.medicines.deactivate(+id)
  }
}
