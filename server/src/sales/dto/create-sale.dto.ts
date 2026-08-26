import { IsInt, IsNumber, IsString, IsOptional, IsArray, ValidateNested, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class SaleItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  batchId: number

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number

  @ApiProperty({ example: 150.0 })
  @IsNumber()
  saleRate: number

  @ApiProperty({ example: 0, minimum: 0 })
  @IsNumber()
  @Min(0)
  discount: number

  @ApiProperty({ example: 0, minimum: 0 })
  @IsNumber()
  @Min(0)
  taxRate: number

  @ApiProperty({ example: 300.0 })
  @IsNumber()
  total: number
}

export class CreateSaleDto {
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

  @ApiProperty({ example: 300.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  amountPaid: number

  @ApiProperty({ example: 0, minimum: 0 })
  @IsNumber()
  @Min(0)
  changeAmount: number

  @ApiProperty({ example: 'CASH', enum: ['CASH', 'CARD', 'CREDIT', 'SPLIT'] })
  @IsString()
  paymentMethod: string

  @ApiPropertyOptional({ example: 'Walk-in customer' })
  @IsOptional()
  @IsString()
  notes?: string

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  quotationId?: number
}
