import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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
