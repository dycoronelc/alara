import { IsEnum, IsOptional, IsString, IsDateString, IsNumber } from 'class-validator';

export class UpdateStatusDto {
  @IsEnum(['SOLICITADA', 'AGENDADA', 'REALIZADA', 'CANCELADA', 'APROBADA', 'RECHAZADA'])
  new_status!: 'SOLICITADA' | 'AGENDADA' | 'REALIZADA' | 'CANCELADA' | 'APROBADA' | 'RECHAZADA';

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  scheduled_start_at?: string;

  @IsOptional()
  @IsDateString()
  scheduled_end_at?: string;

  @IsOptional()
  @IsNumber()
  assigned_investigator_user_id?: number;

  @IsOptional()
  @IsString()
  cancellation_reason?: string;
}
