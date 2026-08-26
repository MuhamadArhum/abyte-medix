import { IsInt, IsNumber, IsString, IsOptional, IsArray, ValidateNested, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

class PurchaseItemDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  batchId?: number

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  medicineId?: number

  @ApiPropertyOptional({ example: 'BATCH-2024-001' })
  @IsOptional()
  @IsString()
  batchNumber?: string

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsString()
  mfgDate?: string

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  expiryDate?: string

  @ApiProperty({ example: 80.0 })
  @IsNumber()
  purchaseRate: number

  @ApiProperty({ example: 150.0 })
  @IsNumber()
  saleRate: number

  @ApiProperty({ example: 100, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number

  @ApiPropertyOptional({ example: 5, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  freeQuantity?: number

  @ApiProperty({ example: 0, minimum: 0 })
  @IsNumber()
  @Min(0)
  discount: number

  @ApiProperty({ example: 0, minimum: 0 })
  @IsNumber()
  @Min(0)
  taxRate: number

  @ApiProperty({ example: 8000.0 })
  @IsNumber()
  total: number
}

export class CreatePurchaseDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  supplierId: number

  @ApiPropertyOptional({ example: 'SUP-INV-001' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string

  @ApiPropertyOptional({ example: '2026-08-26' })
  @IsOptional()
  @IsString()
  purchaseDate?: string

  @ApiProperty({ type: [PurchaseItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[]

  @ApiProperty({ example: 8000.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  subtotal: number

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number

  @ApiPropertyOptional({ example: 0, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number

  @ApiProperty({ example: 8000.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  total: number

  @ApiPropertyOptional({ example: 5000.0, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number

  @ApiPropertyOptional({ example: 'First batch of the month' })
  @IsOptional()
  @IsString()
  notes?: string
}
