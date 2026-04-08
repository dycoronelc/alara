import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}
