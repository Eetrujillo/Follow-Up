import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { randomUUID } from 'node:crypto';
import { rethrowPrismaError } from '../prisma/prisma-error';

/**
 * Like TasksService, the owner comes from the verified token and is the first
 * argument of every method. Calendar events and their linked task are created in
 * one transaction because an event without its task is a broken reminder.
 */
@Injectable()
export class CalendarService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCalendarEventDto) {
    try {
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // UTC midnight, not server-local midnight: the container runs in UTC and a
        // developer machine does not, so local construction would store a different
        // instant depending on where the app happens to run.
        const dueDate = new Date(Date.UTC(dto.year, dto.month - 1, dto.day));

        const task = await tx.task.create({
          data: {
            id: randomUUID(),
            userId,
            description: `Evento: ${dto.title}`,
            origin: 'CALENDAR',
            dueDate,
          },
        });

        return tx.calendarEvent.create({
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
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async findAll(userId: string, _month?: number, _year?: number) {
    try {
      return await this.prisma.calendarEvent.findMany({
        where: { userId },
        include: {
          Task: true,
        },
        orderBy: { eventDate: 'asc' },
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async update(userId: string, eventId: string, dto: UpdateCalendarEventDto) {
    const event = await this.assertOwnedBy(userId, eventId);

    try {
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // The date is one value built from three fields; the DTO guarantees that
        // either all three arrive as integers or none does, and this check keeps a
        // `null` from reaching `Date.UTC` (null coerces to 1899-11-30) even if that
        // guarantee is ever bypassed.
        const hasNewDate =
          typeof dto.day === 'number' &&
          typeof dto.month === 'number' &&
          typeof dto.year === 'number';
        const eventDate = hasNewDate
          ? new Date(Date.UTC(dto.year as number, (dto.month as number) - 1, dto.day as number))
          : null;

        if (event.linkedTaskId && (dto.title !== undefined || eventDate)) {
          // The event and its task are one reminder in two rows: renaming only the
          // event leaves the task list showing the old title, and moving only the
          // event leaves the reminder on the old day.
          await tx.task.updateMany({
            where: { id: event.linkedTaskId, userId },
            data: {
              ...(dto.title !== undefined && { description: `Evento: ${dto.title}` }),
              ...(eventDate && { dueDate: eventDate }),
            },
          });
        }

        return tx.calendarEvent.update({
          where: { id: eventId },
          data: {
            ...(dto.title !== undefined && { title: dto.title }),
            ...(dto.colorHex !== undefined && { colorHex: dto.colorHex }),
            ...(eventDate && { eventDate }),
          },
          include: { Task: true },
        });
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async remove(userId: string, eventId: string) {
    const event = await this.assertOwnedBy(userId, eventId);

    try {
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        if (event.linkedTaskId) {
          // No catch: if the linked task cannot be deleted the removal must abort.
          // Swallowing it deleted the event and left the task behind, unlinked.
          await tx.task.delete({
            where: { id: event.linkedTaskId },
          });
        }

        return tx.calendarEvent.delete({
          where: { id: eventId },
        });
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  /**
   * An event that belongs to somebody else answers exactly like a missing one, so
   * the status code cannot be used to probe which ids exist.
   */
  private async assertOwnedBy(userId: string, eventId: string) {
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id: eventId, userId },
    });

    if (!event) {
      throw new NotFoundException('El evento no existe o no pertenece al usuario');
    }

    return event;
  }
}
