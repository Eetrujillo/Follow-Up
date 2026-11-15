import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { randomUUID } from 'node:crypto';
import { rethrowPrismaError } from '../prisma/prisma-error';

/**
 * Every method takes the owner as its first argument. The caller is the controller,
 * which gets that id from the verified token, never from the request body: a
 * service that resolves its own user is how every row became public before.
 */
@Injectable()
export class TasksService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTaskDto) {
    try {
      return await this.prisma.task.create({
        data: {
          id: randomUUID(),
          userId,
          description: dto.description,
          origin: dto.origin ?? 'DASHBOARD',
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        },
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async findAll(userId: string) {
    try {
      return await this.prisma.task.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
    await this.assertOwnedBy(userId, taskId);

    try {
      return await this.prisma.task.update({
        where: { id: taskId },
        data: {
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.isCompleted !== undefined && { isCompleted: dto.isCompleted }),
          ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        },
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async remove(userId: string, taskId: string) {
    await this.assertOwnedBy(userId, taskId);

    try {
      return await this.prisma.task.delete({
        where: { id: taskId },
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  /**
   * A row that belongs to somebody else answers exactly like a row that does not
   * exist: a different status would confirm the id is real.
   */
  private async assertOwnedBy(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, userId },
    });

    if (!task) {
      throw new NotFoundException('La tarea no existe o no pertenece al usuario');
    }

    return task;
  }
}
