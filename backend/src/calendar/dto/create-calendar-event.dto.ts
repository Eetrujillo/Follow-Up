import { IsHexColor, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateCalendarEventDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsOptional()
  @IsHexColor()
  colorHex?: string;

  @IsInt()
  @Min(1)
  @Max(31)
  day!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsInt()
  @Min(2000)
  year!: number;
}
