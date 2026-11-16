import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  description!: string;

  // Only the value the server would pick: a CALENDAR task is minted in /api/calendar.
  @IsOptional()
  @IsIn(['DASHBOARD'], {
    message: 'origin solo admite DASHBOARD: las tareas de calendario se crean en /api/calendar',
  })
  origin?: 'DASHBOARD';

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
