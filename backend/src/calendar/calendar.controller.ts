import { Body, Controller, Delete, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PublicUser } from '../users/users.service';

@Controller('calendar')
export class CalendarController {
  constructor(@Inject(CalendarService) private readonly calendarService: CalendarService) {}

  @Post()
  create(@CurrentUser() user: PublicUser, @Body() dto: CreateCalendarEventDto) {
    return this.calendarService.create(user.id, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: PublicUser,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.calendarService.findAll(user.id, month, year);
  }

  @Delete(':id')
  remove(@CurrentUser() user: PublicUser, @Param('id') id: string) {
    return this.calendarService.remove(user.id, id);
  }
}
