import {
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsRealCalendarDate } from './is-real-calendar-date';

export class CreateCalendarEventDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsHexColor()
  colorHex?: string;

  @IsInt()
  @Min(1)
  @Max(31)
  // Range decorators alone accept 31 February; this one checks the combination.
  @IsRealCalendarDate()
  day!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsInt()
  @Min(2000)
  // Bounded so a date the runtime cannot represent never reaches the database.
  @Max(9999)
  year!: number;
}
