import { Module } from '@nestjs/common';
import { NotepadController } from './notepad.controller';
import { NotepadService } from './notepad.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotepadController],
  providers: [NotepadService],
})
export class NotepadModule {}
