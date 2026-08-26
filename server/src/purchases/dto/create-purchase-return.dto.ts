import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

class PurchaseReturnItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  batchId: number

  @ApiProperty({ example: 10, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number

  @ApiProperty({ example: 800.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number
}

export class CreatePurchaseReturnDto {
  @ApiPropertyOptional({ example: 'Damaged goods' })
  @IsOptional()
  @IsString()
  reason?: string

  @ApiProperty({ example: 800.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  totalAmount: number

  @ApiPropertyOptional({ type: [PurchaseReturnItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseReturnItemDto)
  items?: PurchaseReturnItemDto[]
}
