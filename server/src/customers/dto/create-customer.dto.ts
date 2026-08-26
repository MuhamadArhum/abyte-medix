import { IsString, IsOptional, IsNumber, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateCustomerDto {
  @ApiProperty({ example: 'Ahmed Khan' })
  @IsString()
  name: string

  @ApiPropertyOptional({ example: '0300-1234567' })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional({ example: 'House 5, Block A, Lahore' })
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional({ example: 5000, minimum: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  creditLimit?: number
}
