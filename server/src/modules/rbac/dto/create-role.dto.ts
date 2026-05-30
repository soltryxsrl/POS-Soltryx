import {
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRoleDto {
  /** Código único, MAYÚSCULAS + underscores (ej. "WAREHOUSE_OPS"). */
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'code debe ser MAYÚSCULAS (A-Z, 0-9, _) y empezar con letra',
  })
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  permissionIds?: string[];
}
