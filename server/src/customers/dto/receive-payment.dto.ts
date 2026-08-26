import { IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ReceivePaymentDto {
  @ApiProperty({ example: 2000.0, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number

  @ApiPropertyOptional({ example: 'CASH' })
  @IsOptional()
  @IsString()
  method?: string

  @ApiPropertyOptional({ example: 'CHQ-12345' })
  @IsOptional()
  @IsString()
  reference?: string

  @ApiPropertyOptional({ example: 'Monthly payment' })
  @IsOptional()
  @IsString()
  notes?: string
}
