import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class ReportFieldDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  value?: string;
}

class ReportSectionDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  order?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportFieldDto)
  fields!: ReportFieldDto[];
}

export class SaveReportDto {
  @IsOptional()
  @IsEnum(['PENDIENTE', 'FAVORABLE', 'NO_FAVORABLE', 'INCONCLUSO'])
  outcome?: 'PENDIENTE' | 'FAVORABLE' | 'NO_FAVORABLE' | 'INCONCLUSO';

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  additional_comments?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportSectionDto)
  sections!: ReportSectionDto[];
}
