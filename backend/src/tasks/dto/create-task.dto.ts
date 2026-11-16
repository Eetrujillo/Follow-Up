import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
