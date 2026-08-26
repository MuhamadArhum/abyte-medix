import { IsString, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateManufacturerDto {
  @ApiProperty({ example: 'GlaxoSmithKline' })
  @IsString()
  @MinLength(1)
  name: string
}
