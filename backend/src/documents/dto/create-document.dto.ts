import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @IsNotEmpty()
  @IsString()
  folderId!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  contentHtml?: string;

  @IsOptional()
  @IsBoolean()
  fromNotepad?: boolean;
}
