import { Controller, Get, Inject, Post } from '@nestjs/common';
import { StatsService } from './stats.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PublicUser } from '../users/users.service';

@Controller('stats')
export class StatsController {
  constructor(@Inject(StatsService) private readonly statsService: StatsService) {}

  @Get('streak')
  getStreak(@CurrentUser() user: PublicUser) {
    return this.statsService.getStreak(user.id);
  }

  @Post('visit')
  registerVisit(@CurrentUser() user: PublicUser) {
    return this.statsService.registerVisit(user.id);
  }
}
