import { IsString, IsOptional, IsNumber, IsBoolean, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateMedicineDto {
  @ApiPropertyOptional({ example: 'Panadol Extra' })
  @IsOptional()
  @IsString()
  brandName?: string

  @ApiPropertyOptional({ example: 'Paracetamol' })
  @IsOptional()
  @IsString()
  genericName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productCode?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  strength?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dosageForm?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  packSize?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taxRate?: number

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  reorderLevel?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  prescriptionRequired?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  manufacturerId?: number
}
