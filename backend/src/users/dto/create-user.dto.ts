import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsString()
  @IsNotEmpty()
  full_name!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;

  /** Mismo valor que `roles.code` y que `users.user_type`. */
  @IsEnum(['INSURER_USER', 'ALARA_USER', 'ADMIN', 'BROKER_USER'])
  role_code!: 'INSURER_USER' | 'ALARA_USER' | 'ADMIN' | 'BROKER_USER';

  /** Obligatorio para Aseguradora y Corredor */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  insurer_id?: number;

  /** Opcional; si no se envía en Administrador, se usa la primera oficina ALARA */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  alara_office_id?: number;
}
