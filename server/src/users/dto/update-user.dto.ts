import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Role } from '@prisma/client'

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  fullName?: string

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional({ example: 'T1,T2' })
  @IsOptional()
  @IsString()
  allowedTerminals?: string
}
