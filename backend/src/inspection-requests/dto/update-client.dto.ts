import { IsEmail, IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  @IsEnum(['CEDULA', 'PASSPORT', 'OTRO'])
  id_type?: 'CEDULA' | 'PASSPORT' | 'OTRO';

  @IsOptional()
  @IsString()
  id_number?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone_mobile?: string;

  @IsOptional()
  @IsString()
  phone_home?: string;

  @IsOptional()
  @IsString()
  phone_work?: string;

  @IsOptional()
  @IsString()
  employer_name?: string;

  @IsOptional()
  @IsString()
  employer_tax_id?: string;

  @IsOptional()
  @IsString()
  profession?: string;
}
