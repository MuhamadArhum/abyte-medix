import { IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class CloseShiftDto {
  @ApiPropertyOptional({ example: 12500, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  closingBalance?: number

  @ApiPropertyOptional({ example: 'All clear, no discrepancies' })
  @IsOptional()
  @IsString()
  notes?: string
}
