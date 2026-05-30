import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const DOC_TYPES = ['CEDULA', 'RNC', 'PASSPORT', 'OTHER'] as const;
export type DocType = (typeof DOC_TYPES)[number];

export class CreateCustomerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  fullName!: string;

  @IsOptional()
  @IsIn(DOC_TYPES)
  documentType?: DocType;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  document?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
