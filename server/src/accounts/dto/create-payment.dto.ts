import { IsString, IsNumber, IsOptional, IsInt, IsEnum, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PaymentType } from '@prisma/client'

export class CreatePaymentDto {
  @ApiProperty({ enum: PaymentType, example: PaymentType.CUSTOMER_RECEIPT })
  @IsEnum(PaymentType)
  type: PaymentType

  @ApiProperty({ example: 2000.0, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number

  @ApiPropertyOptional({ example: 'CASH' })
  @IsOptional()
  @IsString()
  method?: string

  @ApiPropertyOptional({ example: 'REF-001' })
  @IsOptional()
  @IsString()
  reference?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  customerId?: number

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  supplierId?: number

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  saleId?: number

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  purchaseId?: number
}
