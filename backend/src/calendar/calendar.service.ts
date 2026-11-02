import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { randomUUID } from 'node:crypto';
import { rethrowPrismaError } from '../prisma/prisma-error';

@Injectable()
export class CalendarService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCalendarEventDto) {
    try {
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const dueDate = new Date(dto.year, dto.month - 1, dto.day);

        const task = await tx.task.create({
          data: {
            id: randomUUID(),
            userId,
            description: `Evento: ${dto.title}`,
            origin: 'CALENDAR',
            dueDate,
          },
        });

        const event = await tx.calendarEvent.create({
          data: {
            id: randomUUID(),
            userId,
            title: dto.title,
            colorHex: dto.colorHex ?? '#3B82F6',
            eventDate: dueDate,
            linkedTaskId: task.id,
          },
          include: {
            Task: true,
          },
        });

        return event;
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async update(userId: string, eventId: string, dto: UpdateCalendarEventDto) {
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id: eventId, userId },
    });

    if (!event) {
      throw new NotFoundException('El evento no existe o no pertenece al usuario');
    }

    const hasDateChange =
      dto.day !== undefined || dto.month !== undefined || dto.year !== undefined;

    const eventDate = hasDateChange
      ? new Date(
          dto.year ?? event.eventDate.getFullYear(),
          (dto.month ?? event.eventDate.getMonth() + 1) - 1,
          dto.day ?? event.eventDate.getDate(),
        )
      : undefined;

    try {
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        if (event.linkedTaskId && (dto.title !== undefined || eventDate)) {
          await tx.task
            .update({
              where: { id: event.linkedTaskId },
              data: {
                ...(dto.title !== undefined && { description: `Evento: ${dto.title}` }),
                ...(eventDate !== undefined && { dueDate: eventDate }),
              },
            })
            .catch(() => null);
        }

        return tx.calendarEvent.update({
          where: { id: eventId },
          data: {
            ...(dto.title !== undefined && { title: dto.title }),
            ...(dto.colorHex !== undefined && { colorHex: dto.colorHex }),
            ...(eventDate !== undefined && { eventDate }),
          },
          include: {
            Task: true,
          },
        });
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async findAll(userId: string, month?: number, year?: number) {
    const where: Prisma.CalendarEventWhereInput = { userId };

    if (year !== undefined && month !== undefined) {
      where.eventDate = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      };
    } else if (year !== undefined) {
      where.eventDate = {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      };
    }

    try {
      return await this.prisma.calendarEvent.findMany({
        where,
        include: {
          Task: true,
        },
        orderBy: { eventDate: 'asc' },
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async remove(userId: string, eventId: string) {
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id: eventId, userId },
    });

    if (!event) {
      throw new NotFoundException('El evento no existe o no pertenece al usuario');
    }

    try {
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        if (event.linkedTaskId) {
          await tx.task.delete({
            where: { id: event.linkedTaskId },
          }).catch(() => null);
        }

        return tx.calendarEvent.delete({
          where: { id: eventId },
        });
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }
}
