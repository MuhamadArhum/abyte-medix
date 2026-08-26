import { IsString, IsBoolean, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export class PermissionItemDto {
  @ApiProperty({ example: 'sales' })
  @IsString()
  module: string

  @ApiProperty({ example: 'create' })
  @IsString()
  action: string

  @ApiProperty({ example: true })
  @IsBoolean()
  granted: boolean
}

export class SetPermissionsDto {
  @ApiProperty({ type: [PermissionItemDto] })
  @ValidateNested({ each: true })
  @Type(() => PermissionItemDto)
  permissions: PermissionItemDto[]
}
