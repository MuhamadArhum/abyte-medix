import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Role } from '@prisma/client'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { SetPermissionsDto } from './dto/set-permissions.dto'

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @ApiOperation({ summary: 'Create a new user' })
  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() user: any) {
    return this.users.create(dto, user.id)
  }

  @ApiOperation({ summary: 'Get all users' })
  @Get()
  findAll() {
    return this.users.findAll()
  }

  @ApiOperation({ summary: 'Get a user by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(+id)
  }

  @ApiOperation({ summary: 'Update a user' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: any) {
    return this.users.update(+id, dto, user.id)
  }

  @ApiOperation({ summary: 'Reset user password' })
  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto, @CurrentUser() user: any) {
    return this.users.resetPassword(+id, dto.password, user.id)
  }

  @ApiOperation({ summary: 'Delete a user' })
  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.users.delete(+id, user.id)
  }

  @ApiOperation({ summary: 'Set module permissions for a user' })
  @Post(':id/permissions')
  setPermissions(@Param('id') id: string, @Body() dto: SetPermissionsDto, @CurrentUser() user: any) {
    return this.users.setPermissions(+id, dto.permissions, user.id)
  }
}
