import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';

export enum TaskOrigin {
  DASHBOARD = 'DASHBOARD',
  CALENDAR = 'CALENDAR',
}

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  description!: string;

  @IsOptional()
  @IsEnum(TaskOrigin)
  origin?: TaskOrigin;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
