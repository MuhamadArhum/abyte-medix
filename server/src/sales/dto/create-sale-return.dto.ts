import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsInt, IsBoolean, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

class ReturnItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  batchId: number

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number

  @ApiProperty({ example: false })
  @IsBoolean()
  isDamaged: boolean

  @ApiProperty({ example: 150.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  refundAmount: number
}

export class CreateSaleReturnDto {
  @ApiProperty({ example: 'Customer returned wrong item' })
  @IsString()
  reason: string

  @ApiProperty({ type: [ReturnItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[]

  @ApiProperty({ example: 150.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  refundAmount: number

  @ApiPropertyOptional({ example: 'CASH' })
  @IsOptional()
  @IsString()
  refundMethod?: string
}
