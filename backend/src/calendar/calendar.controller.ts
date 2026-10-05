import { Body, Controller, Delete, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';

@Controller('calendar')
export class CalendarController {
  constructor(@Inject(CalendarService) private readonly calendarService: CalendarService) {}

  @Post()
  create(@Body() dto: CreateCalendarEventDto) {
    return this.calendarService.create(dto);
  }

  @Get()
  findAll(@Query('month') month?: number, @Query('year') year?: number) {
    return this.calendarService.findAll(month, year);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.calendarService.remove(id);
  }
}
