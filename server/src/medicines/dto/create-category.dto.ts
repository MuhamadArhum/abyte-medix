import { IsString, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateCategoryDto {
  @ApiProperty({ example: 'Antibiotics' })
  @IsString()
  @MinLength(1)
  name: string
}
