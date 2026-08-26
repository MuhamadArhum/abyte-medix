import { IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class MakePaymentDto {
  @ApiProperty({ example: 5000.0, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number

  @ApiPropertyOptional({ example: 'CASH' })
  @IsOptional()
  @IsString()
  method?: string

  @ApiPropertyOptional({ example: 'TT-98765' })
  @IsOptional()
  @IsString()
  reference?: string

  @ApiPropertyOptional({ example: 'Partial payment for October' })
  @IsOptional()
  @IsString()
  notes?: string
}
