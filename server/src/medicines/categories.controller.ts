import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCategoryDto } from './dto/create-category.dto'

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } })
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: { name: dto.name } })
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.prisma.category.delete({ where: { id: +id } })
  }
}
