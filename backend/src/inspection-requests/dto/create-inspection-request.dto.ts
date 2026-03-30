import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Min,
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
  if (upper === 'CEDULA' || upper === 'PASSPORT' || upper === 'OTRO') {
    return upper as 'CEDULA' | 'PASSPORT' | 'OTRO';
  }
  const normalized = ID_TYPE_MAP[s.toLowerCase()];
  return normalized;
}

function emptyStringToUndefined(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s === '' ? undefined : s;
}

export class ClientInputDto {
  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @IsDateString()
  dob!: string;

  @Transform(({ value }) => normalizeIdType(value))
  @IsEnum(['CEDULA', 'PASSPORT', 'OTRO'])
  id_type!: 'CEDULA' | 'PASSPORT' | 'OTRO';

  @IsString()
  @IsNotEmpty()
  @ValidateIf((o: ClientInputDto) => o.id_type === 'CEDULA')
  @IsPanamaCedula()
  id_number!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  phone_mobile!: string;

  @IsString()
  @IsNotEmpty()
  phone_home!: string;

  @IsString()
  @IsNotEmpty()
  phone_work!: string;

  @IsString()
  @IsNotEmpty()
  address_line!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsNotEmpty()
  country!: string;

  @IsString()
  @IsNotEmpty()
  employer_name!: string;

  @IsOptional()
  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsString()
  employer_tax_id?: string;

  @IsString()
  @IsNotEmpty()
  profession!: string;
}

export class CreateInspectionRequestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  service_type_id!: number;

  @IsString()
  @IsNotEmpty()
  request_number!: string;

  @IsString()
  @IsNotEmpty()
  agent_name!: string;

  @Type(() => Number)
  @IsNumber()
  insured_amount!: number;

  @IsBoolean()
  has_amount_in_force!: boolean;

  @ValidateIf((o: CreateInspectionRequestDto) => o.has_amount_in_force === true)
  @Type(() => Number)
  @IsNumber()
  amount_in_force?: number;

  @IsString()
  @IsNotEmpty()
  responsible_name!: string;

  @IsString()
  @IsNotEmpty()
  responsible_phone!: string;

  @Transform(({ value }) => emptyStringToUndefined(value))
  @IsEmail()
  responsible_email!: string;

  @IsString()
  @IsNotEmpty()
  marital_status!: string;

  @IsString()
  @IsNotEmpty()
  comments!: string;

  @IsBoolean()
  client_notified!: boolean;

  /** Obligatorio si `client_notified` es true: inicio de la entrevista (ISO 8601). */
  @ValidateIf((o: CreateInspectionRequestDto) => o.client_notified === true)
  @IsDateString()
  @IsNotEmpty()
  scheduled_start_at?: string;

  /** Fin de la entrevista; si no se envía, se asume 1 hora después del inicio. */
  @ValidateIf((o: CreateInspectionRequestDto) => o.client_notified === true)
  @IsOptional()
  @IsDateString()
  scheduled_end_at?: string;

  @IsString()
  @IsNotEmpty()
  interview_language!: string;

  @IsOptional()
  @IsEnum(['NORMAL', 'ALTA'])
  priority?: 'NORMAL' | 'ALTA';

  @ValidateNested()
  @Type(() => ClientInputDto)
  client!: ClientInputDto;
}
