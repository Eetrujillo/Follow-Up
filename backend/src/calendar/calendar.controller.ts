import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { ListCalendarQueryDto } from './dto/list-calendar-query.dto';
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
  findAll(@CurrentUser() user: PublicUser, @Query() query: ListCalendarQueryDto) {
    return this.calendarService.findAll(user.id, query.month, query.year);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: PublicUser,
    @Param('id') id: string,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    return this.calendarService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: PublicUser, @Param('id') id: string) {
    return this.calendarService.remove(user.id, id);
  }
}
