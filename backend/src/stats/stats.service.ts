import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { rethrowPrismaError } from '../prisma/prisma-error';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

@Injectable()
export class StatsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getStreak(userId: string) {
    try {
      const streak = await this.prisma.statsStreak.findUnique({ where: { userId } });
      return (
        streak ?? {
          id: null,
          userId,
          lastVisitDate: null,
          currentStreakDays: 0,
          updatedAt: null,
        }
      );
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async registerVisit(userId: string) {
    try {
      const now = new Date();
      const today = startOfUtcDay(now);
      const current = await this.prisma.statsStreak.findUnique({ where: { userId } });

      let currentStreakDays = 1;
      if (current) {
        const lastVisit = startOfUtcDay(current.lastVisitDate);
        const elapsedDays = Math.round((today.getTime() - lastVisit.getTime()) / DAY_MS);

        if (elapsedDays === 0) {
          currentStreakDays = current.currentStreakDays;
        } else if (elapsedDays === 1) {
          currentStreakDays = current.currentStreakDays + 1;
        }
      }

      return await this.prisma.statsStreak.upsert({
        where: { userId },
        create: {
          id: randomUUID(),
          userId,
          lastVisitDate: today,
          currentStreakDays,
          updatedAt: now,
        },
        update: {
          lastVisitDate: today,
          currentStreakDays,
          updatedAt: now,
        },
      });
    } catch (error) {
      rethrowPrismaError(error);
    }
  }
}
