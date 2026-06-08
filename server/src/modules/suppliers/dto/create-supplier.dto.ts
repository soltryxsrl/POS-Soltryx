import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  tradeName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  legalName?: string;

  // RNC obligatorio para el proveedor (necesario para el 606 de compras).
  @IsString()
  @MinLength(1, { message: 'El RNC del proveedor es obligatorio' })
  @MaxLength(32)
  rnc!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
