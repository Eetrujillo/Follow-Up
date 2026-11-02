import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { rethrowPrismaError } from '../prisma/prisma-error';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class DocumentsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async assertFolder(userId: string, folderId: string) {
    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, userId },
      select: { id: true },
    });
    if (!folder) {
      throw new NotFoundException('La carpeta no existe o no pertenece al usuario');
    }
  }

  private async findOwned(userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
    });
    if (!document) {
      throw new NotFoundException('El documento no existe o no pertenece al usuario');
    }
    return document;
  }

  async create(userId: string, dto: CreateDocumentDto) {
    await this.assertFolder(userId, dto.folderId);

    try {
      const now = new Date();
      return await this.prisma.document.create({
        data: {
          id: randomUUID(),
          userId,
          folderId: dto.folderId,
          title: dto.title,
          contentHtml: dto.contentHtml ?? '',
          fromNotepad: dto.fromNotepad ?? false,
          updatedAt: now,
        },
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async findAll(userId: string, folderId?: string) {
    try {
      return await this.prisma.document.findMany({
        where: { userId, ...(folderId ? { folderId } : {}) },
        orderBy: { updatedAt: 'desc' },
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async findOne(userId: string, documentId: string) {
    return this.findOwned(userId, documentId);
  }

  async update(userId: string, documentId: string, dto: UpdateDocumentDto) {
    await this.findOwned(userId, documentId);
    if (dto.folderId !== undefined) {
      await this.assertFolder(userId, dto.folderId);
    }

    try {
      return await this.prisma.document.update({
        where: { id: documentId },
        data: {
          ...(dto.folderId !== undefined && { folderId: dto.folderId }),
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.contentHtml !== undefined && { contentHtml: dto.contentHtml }),
          ...(dto.fromNotepad !== undefined && { fromNotepad: dto.fromNotepad }),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async remove(userId: string, documentId: string) {
    await this.findOwned(userId, documentId);

    try {
      return await this.prisma.document.delete({ where: { id: documentId } });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }
}
