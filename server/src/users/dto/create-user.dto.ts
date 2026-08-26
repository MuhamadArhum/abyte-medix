import { IsString, MinLength, IsEnum, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Role } from '@prisma/client'

export class CreateUserDto {
  @ApiProperty({ example: 'john_cashier' })
  @IsString()
  username: string

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  fullName: string

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string

  @ApiProperty({ enum: Role, example: Role.CASHIER })
  @IsEnum(Role)
  role: Role

  @ApiPropertyOptional({ example: 'T1,T2' })
  @IsOptional()
  @IsString()
  allowedTerminals?: string
}
