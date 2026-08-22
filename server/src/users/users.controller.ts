import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Role } from '@prisma/client'

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Post()
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.users.create(body, user.id)
  }

  @Get()
  findAll() {
    return this.users.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(+id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.users.update(+id, body, user.id)
  }

  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string, @Body() body: { password: string }, @CurrentUser() user: any) {
    return this.users.resetPassword(+id, body.password, user.id)
  }

  @Post(':id/permissions')
  setPermissions(@Param('id') id: string, @Body() body: any[], @CurrentUser() user: any) {
    return this.users.setPermissions(+id, body, user.id)
  }
}
