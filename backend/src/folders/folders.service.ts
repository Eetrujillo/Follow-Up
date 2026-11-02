import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { rethrowPrismaError } from '../prisma/prisma-error';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

@Injectable()
export class FoldersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateFolderDto) {
    try {
      return await this.prisma.folder.create({
        data: {
          id: randomUUID(),
          userId,
          name: dto.name,
          isNotesFolder: dto.isNotesFolder ?? false,
        },
        include: { Document: { orderBy: { createdAt: 'desc' } } },
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async findAll(userId: string) {
    try {
      return await this.prisma.folder.findMany({
        where: { userId },
        include: { Document: { orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async findOne(userId: string, folderId: string) {
    try {
      const folder = await this.prisma.folder.findFirst({
        where: { id: folderId, userId },
        include: { Document: { orderBy: { createdAt: 'desc' } } },
      });
      if (!folder) throw new NotFoundException('La carpeta no existe o no pertenece al usuario');
      return folder;
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async update(userId: string, folderId: string, dto: UpdateFolderDto) {
    await this.findOne(userId, folderId);

    try {
      return await this.prisma.folder.update({
        where: { id: folderId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.isNotesFolder !== undefined && { isNotesFolder: dto.isNotesFolder }),
        },
        include: { Document: { orderBy: { createdAt: 'desc' } } },
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async remove(userId: string, folderId: string) {
    await this.findOne(userId, folderId);

    try {
      return await this.prisma.folder.delete({ where: { id: folderId } });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }
}
