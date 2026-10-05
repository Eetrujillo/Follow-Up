import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateStatDto {
  @IsString()
  name!: string;

  @IsNumber()
  @IsOptional()
  value?: number;
}
