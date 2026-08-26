import { IsString, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Ahmed Khan' })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional({ example: '0300-1234567' })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional({ example: 'House 5, Block A, Lahore' })
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional({ example: 10000, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  creditLimit?: number

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
