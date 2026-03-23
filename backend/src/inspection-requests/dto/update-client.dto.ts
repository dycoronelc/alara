import { IsEmail, IsEnum, IsOptional, IsString, IsDateString, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsPanamaCedula } from '../../common/validation/panama-cedula.validator';

function emptyStringToUndefined(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s === '' ? undefined : s;
}

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

  @ValidateIf((o: UpdateClientDto) => o.id_type === 'CEDULA')
  @IsOptional()
  @IsString()
  @IsPanamaCedula()
  id_number?: string;

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
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
  address_line?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

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
