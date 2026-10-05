import { IsOptional, IsString } from 'class-validator';

export class CreateNotepadDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  content?: string;
}
