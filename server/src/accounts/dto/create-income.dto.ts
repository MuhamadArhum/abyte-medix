import { IsString, IsNumber, IsOptional, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateIncomeDto {
  @ApiProperty({ example: 'Other Income' })
  @IsString()
  category: string

  @ApiPropertyOptional({ example: 'Rental income from shop space' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ example: 10000.0, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number

  @ApiPropertyOptional({ example: '2026-08-26' })
  @IsOptional()
  @IsString()
  date?: string
}
