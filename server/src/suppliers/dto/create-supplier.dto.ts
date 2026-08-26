import { IsString, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateSupplierDto {
  @ApiProperty({ example: 'MediCo Pharmaceuticals' })
  @IsString()
  name: string

  @ApiPropertyOptional({ example: 'Ali Raza' })
  @IsOptional()
  @IsString()
  contactPerson?: string

  @ApiPropertyOptional({ example: '042-1234567' })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional({ example: 'Plot 12, Industrial Area, Karachi' })
  @IsOptional()
  @IsString()
  address?: string
}
