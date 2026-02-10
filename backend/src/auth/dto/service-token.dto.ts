import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ServiceTokenDto {
  @IsNumber()
  user_id!: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  label?: string;
}
