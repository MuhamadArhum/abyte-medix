import { IsInt, IsString, IsEnum, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

enum AdjustmentType {
  ADJUSTMENT_IN = 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT = 'ADJUSTMENT_OUT',
  EXPIRY_WRITEOFF = 'EXPIRY_WRITEOFF',
  DAMAGE = 'DAMAGE',
}

export class AdjustmentDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  batchId: number

  @ApiProperty({ enum: AdjustmentType, example: AdjustmentType.ADJUSTMENT_OUT })
  @IsEnum(AdjustmentType)
  type: AdjustmentType

  @ApiProperty({ example: 5, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number

  @ApiProperty({ example: 'Damaged during storage' })
  @IsString()
  reason: string
}
