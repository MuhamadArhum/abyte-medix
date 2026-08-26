import { IsInt, IsNumber, IsString, IsOptional, IsArray, ValidateNested, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { SaleItemDto } from './create-sale.dto'

export class HoldSaleDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  customerId?: number

  @ApiPropertyOptional({ example: 'T1' })
  @IsOptional()
  @IsString()
  terminalId?: string

  @ApiProperty({ type: [SaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[]

  @ApiProperty({ example: 300.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  subtotal: number

  @ApiProperty({ example: 0, minimum: 0 })
  @IsNumber()
  @Min(0)
  discountAmount: number

  @ApiProperty({ example: 0, minimum: 0 })
  @IsNumber()
  @Min(0)
  taxAmount: number

  @ApiProperty({ example: 300.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  total: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string
}
