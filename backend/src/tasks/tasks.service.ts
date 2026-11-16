import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
          // The DTO accepts only this value, so nothing is rewritten silently.
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
    const task = await this.assertOwnedBy(userId, taskId);

    try {
      return await this.prisma.task.update({
        where: { id: taskId },
        data: {
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.isCompleted !== undefined && { isCompleted: dto.isCompleted }),
          // completedAt records the moment the task became completed, so it is set
          // on the transition and cleared on reopening, never on a repeated patch.
          ...(dto.isCompleted === true && !task.isCompleted && { completedAt: new Date() }),
          ...(dto.isCompleted === false && task.completedAt !== null && { completedAt: null }),
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
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // The calendar relation is ON DELETE SET NULL, so deleting the task alone
        // would leave a reminder pointing at nothing. The calendar service removes
        // the pair in the other direction for the same reason.
        await tx.calendarEvent.deleteMany({ where: { userId, linkedTaskId: taskId } });

        return tx.task.delete({ where: { id: taskId } });
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
