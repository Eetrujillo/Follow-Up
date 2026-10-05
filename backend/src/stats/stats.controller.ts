import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { StatsService } from './stats.service';
import { CreateStatDto } from './dto/create-stat.dto';
import { UpdateStatDto } from './dto/update-stat.dto';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService = new StatsService()) {}
  @Post() create(@Body() body: CreateStatDto) { return this.statsService.create(body); }
  @Get() findAll() { return this.statsService.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.statsService.findOne(+id); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: UpdateStatDto) { return this.statsService.update(+id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.statsService.remove(+id); }
}
