import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ListDocumentsQueryDto } from './dto/list-documents-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PublicUser } from '../users/users.service';

@Controller('documents')
export class DocumentsController {
  constructor(@Inject(DocumentsService) private readonly documentsService: DocumentsService) {}

  @Post()
  create(@CurrentUser() user: PublicUser, @Body() dto: CreateDocumentDto) {
    return this.documentsService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: PublicUser, @Query() query: ListDocumentsQueryDto) {
    return this.documentsService.findAll(user.id, query.folderId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: PublicUser, @Param('id') id: string) {
    return this.documentsService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: PublicUser,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: PublicUser, @Param('id') id: string) {
    return this.documentsService.remove(user.id, id);
  }
}
