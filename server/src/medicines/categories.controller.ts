import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PrismaService } from '../prisma/prisma.service'

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } })
  }

  @Post()
  create(@Body() body: { name: string }) {
    return this.prisma.category.create({ data: { name: body.name } })
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.prisma.category.delete({ where: { id: +id } })
  }
}
