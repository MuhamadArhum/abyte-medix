import { IsString, IsOptional, IsBoolean } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateSupplierDto {
  @ApiPropertyOptional({ example: 'MediCo Pharmaceuticals' })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional({ example: 'Usman Khan' })
  @IsOptional()
  @IsString()
  contactPerson?: string

  @ApiPropertyOptional({ example: '042-9876543' })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional({ example: 'Plot 12, Industrial Area, Karachi' })
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
