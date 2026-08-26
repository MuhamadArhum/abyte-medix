import { IsString, IsOptional, IsNumber, IsBoolean, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateMedicineDto {
  @ApiProperty({ example: 'Panadol' })
  @IsString()
  brandName: string

  @ApiPropertyOptional({ example: 'Paracetamol' })
  @IsOptional()
  @IsString()
  genericName?: string

  @ApiPropertyOptional({ example: 'MED-001' })
  @IsOptional()
  @IsString()
  productCode?: string

  @ApiPropertyOptional({ example: '6009876543210' })
  @IsOptional()
  @IsString()
  barcode?: string

  @ApiPropertyOptional({ example: '500mg' })
  @IsOptional()
  @IsString()
  strength?: string

  @ApiPropertyOptional({ example: 'Tablet' })
  @IsOptional()
  @IsString()
  dosageForm?: string

  @ApiPropertyOptional({ example: '10 Tablets' })
  @IsOptional()
  @IsString()
  packSize?: string

  @ApiPropertyOptional({ example: 'Strip' })
  @IsOptional()
  @IsString()
  unit?: string

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taxRate?: number

  @ApiPropertyOptional({ example: 10, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  reorderLevel?: number

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  prescriptionRequired?: boolean

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  manufacturerId?: number
}
