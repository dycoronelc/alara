import { IsEnum, IsOptional, IsString } from 'class-validator';

export class DecisionDto {
  @IsEnum(['APROBADA', 'RECHAZADA'])
  decision!: 'APROBADA' | 'RECHAZADA';

  @IsOptional()
  @IsString()
  insurer_decision_reason?: string;

  @IsOptional()
  @IsString()
  insurer_decision_notes?: string;
}
