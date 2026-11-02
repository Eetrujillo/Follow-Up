import { IsOptional, IsString } from 'class-validator';

export class ListDocumentsQueryDto {
  @IsOptional()
  @IsString()
  folderId?: string;
}
