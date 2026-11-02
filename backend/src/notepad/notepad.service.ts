import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { rethrowPrismaError } from '../prisma/prisma-error';
import { SaveNotepadDto } from './dto/save-notepad.dto';

@Injectable()
export class NotepadService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async get(userId: string) {
    try {
      const draft = await this.prisma.notepadDraft.findUnique({ where: { userId } });
      return draft ?? { id: null, userId, contentHtml: '', lastModifiedAt: null };
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async save(userId: string, dto: SaveNotepadDto) {
    try {
      const now = new Date();
      return await this.prisma.notepadDraft.upsert({
        where: { userId },
        create: {
          id: randomUUID(),
          userId,
          contentHtml: dto.contentHtml,
          lastModifiedAt: now,
        },
        update: {
          contentHtml: dto.contentHtml,
          lastModifiedAt: now,
        },
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async remove(userId: string) {
    try {
      const draft = await this.prisma.notepadDraft.findUnique({ where: { userId } });
      if (draft) {
        await this.prisma.notepadDraft.delete({ where: { userId } });
      }
      return { deleted: Boolean(draft) };
    } catch (error) {
      rethrowPrismaError(error);
    }
  }
}
