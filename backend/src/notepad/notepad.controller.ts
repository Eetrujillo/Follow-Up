import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { NotepadService } from './notepad.service';
import { CreateNotepadDto } from './dto/create-notepad.dto';
import { UpdateNotepadDto } from './dto/update-notepad.dto';

@Controller('notepad')
export class NotepadController {
  constructor(private readonly notepadService: NotepadService = new NotepadService()) {}
  @Post() create(@Body() body: CreateNotepadDto) { return this.notepadService.create(body); }
  @Get() findAll() { return this.notepadService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.notepadService.findOne(+id); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: UpdateNotepadDto) { return this.notepadService.update(+id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.notepadService.remove(+id); }
}
