import { IsNumber, IsOptional, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class OpenShiftDto {
  @ApiPropertyOptional({ example: 5000, minimum: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  openingBalance?: number
}
