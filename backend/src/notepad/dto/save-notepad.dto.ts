import { IsString } from 'class-validator';

export class SaveNotepadDto {
  @IsString()
  contentHtml!: string;
}
