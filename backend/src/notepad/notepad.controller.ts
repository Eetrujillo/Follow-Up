import { Body, Controller, Delete, Get, Inject, Put } from '@nestjs/common';
import { NotepadService } from './notepad.service';
import { SaveNotepadDto } from './dto/save-notepad.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PublicUser } from '../users/users.service';

@Controller('notepad')
export class NotepadController {
  constructor(@Inject(NotepadService) private readonly notepadService: NotepadService) {}

  @Get()
  get(@CurrentUser() user: PublicUser) {
    return this.notepadService.get(user.id);
  }

  @Put()
  save(@CurrentUser() user: PublicUser, @Body() dto: SaveNotepadDto) {
    return this.notepadService.save(user.id, dto);
  }

  @Delete()
  remove(@CurrentUser() user: PublicUser) {
    return this.notepadService.remove(user.id);
  }
}
