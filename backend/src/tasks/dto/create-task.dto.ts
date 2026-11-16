import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export enum TaskOrigin {
  DASHBOARD = 'DASHBOARD',
  CALENDAR = 'CALENDAR',
}

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  description!: string;

  // Kept as accepted for now: narrowing this contract is a product decision that
  // does not belong in a deploy range. A CALENDAR task minted here has no event.
  @IsOptional()
  @IsEnum(TaskOrigin)
  origin?: TaskOrigin;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
