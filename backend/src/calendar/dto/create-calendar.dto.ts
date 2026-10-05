import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateCalendarDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  start_date!: string;

  @IsDateString()
  end_date!: string;
}
