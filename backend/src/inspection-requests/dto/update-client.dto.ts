import { IsEmail, IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

const ID_TYPE_MAP: Record<string, 'CEDULA' | 'PASSPORT' | 'OTRO'> = {
  cedula: 'CEDULA',
  cédula: 'CEDULA',
  pasaporte: 'PASSPORT',
  passport: 'PASSPORT',
  otro: 'OTRO',
};

function normalizeIdType(value: unknown): 'CEDULA' | 'PASSPORT' | 'OTRO' | undefined {
  if (value == null || value === '') return undefined;
  const s = String(value).trim();
  const upper = s.toUpperCase();
  if (upper === 'CEDULA' || upper === 'PASSPORT' || upper === 'OTRO') return upper as 'CEDULA' | 'PASSPORT' | 'OTRO';
  const normalized = ID_TYPE_MAP[s.toLowerCase()];
  return normalized ?? (s as 'CEDULA' | 'PASSPORT' | 'OTRO');
}

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
  @Transform(({ value }) => normalizeIdType(value))
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
