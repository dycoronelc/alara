import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  /** Si se envía, reemplaza el rol del usuario y sincroniza `user_type` y vínculos. */
  @IsOptional()
  @IsEnum(['INSURER_USER', 'ALARA_USER', 'ADMIN', 'BROKER_USER'])
  role_code?: 'INSURER_USER' | 'ALARA_USER' | 'ADMIN' | 'BROKER_USER';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  insurer_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  alara_office_id?: number;
}
