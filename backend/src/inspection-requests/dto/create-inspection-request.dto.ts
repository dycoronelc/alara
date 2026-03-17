import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { IsPanamaCedula } from '../../common/validation/panama-cedula.validator';

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

export class ClientInputDto {
  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @IsOptional()
  @IsDateString()
  dob?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeIdType(value))
  @IsEnum(['CEDULA', 'PASSPORT', 'OTRO'])
  id_type?: 'CEDULA' | 'PASSPORT' | 'OTRO';

  @ValidateIf((o: ClientInputDto) => o.id_type === 'CEDULA')
  @IsOptional()
  @IsString()
  @IsPanamaCedula()
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
  employer_name?: string;

  @IsOptional()
  @IsString()
  employer_tax_id?: string;

  @IsOptional()
  @IsString()
  profession?: string;
}

export class CreateInspectionRequestDto {
  @IsString()
  @IsNotEmpty()
  request_number!: string;

  @IsOptional()
  @IsString()
  agent_name?: string;

  @IsOptional()
  @IsNumber()
  insured_amount?: number;

  @IsOptional()
  @IsBoolean()
  has_amount_in_force?: boolean;

  @IsString()
  @IsNotEmpty()
  responsible_name!: string;

  @IsOptional()
  @IsString()
  responsible_phone?: string;

  @IsOptional()
  @IsEmail()
  responsible_email?: string;

  @IsOptional()
  @IsString()
  marital_status?: string;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsBoolean()
  client_notified?: boolean;

  @IsOptional()
  @IsString()
  interview_language?: string;

  @IsOptional()
  @IsEnum(['NORMAL', 'ALTA'])
  priority?: 'NORMAL' | 'ALTA';

  @ValidateNested()
  @Type(() => ClientInputDto)
  client!: ClientInputDto;
}
