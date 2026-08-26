import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PrismaService } from '../prisma/prisma.service'
import { CreateManufacturerDto } from './dto/create-manufacturer.dto'

@ApiTags('Manufacturers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('manufacturers')
export class ManufacturersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.manufacturer.findMany({ orderBy: { name: 'asc' } })
  }

  @Post()
  create(@Body() dto: CreateManufacturerDto) {
    return this.prisma.manufacturer.create({ data: { name: dto.name } })
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.prisma.manufacturer.delete({ where: { id: +id } })
  }
}
