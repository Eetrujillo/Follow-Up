import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService = new DocumentsService()) {}
  @Post() create(@Body() body: CreateDocumentDto) { return this.documentsService.create(body); }
  @Get() findAll() { return this.documentsService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.documentsService.findOne(+id); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: UpdateDocumentDto) { return this.documentsService.update(+id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.documentsService.remove(+id); }
}
