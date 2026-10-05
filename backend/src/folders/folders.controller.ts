import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService = new FoldersService()) {}
  @Post() create(@Body() body: CreateFolderDto) { return this.foldersService.create(body); }
  @Get() findAll() { return this.foldersService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.foldersService.findOne(+id); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: UpdateFolderDto) { return this.foldersService.update(+id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.foldersService.remove(+id); }
}
