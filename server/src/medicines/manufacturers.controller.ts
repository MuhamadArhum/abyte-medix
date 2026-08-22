import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PrismaService } from '../prisma/prisma.service'

@UseGuards(JwtAuthGuard)
@Controller('manufacturers')
export class ManufacturersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.manufacturer.findMany({ orderBy: { name: 'asc' } })
  }

  @Post()
  create(@Body() body: { name: string }) {
    return this.prisma.manufacturer.create({ data: { name: body.name } })
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.prisma.manufacturer.delete({ where: { id: +id } })
  }
}
