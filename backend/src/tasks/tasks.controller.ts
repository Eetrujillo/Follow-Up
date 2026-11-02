import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PublicUser } from '../users/users.service';

@Controller('tasks')
export class TasksController {
  constructor(@Inject(TasksService) private readonly tasksService: TasksService) {}

  @Post()
  create(@CurrentUser() user: PublicUser, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: PublicUser) {
    return this.tasksService.findAll(user.id);
  }

  @Patch(':id')
  update(@CurrentUser() user: PublicUser, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: PublicUser, @Param('id') id: string) {
    return this.tasksService.remove(user.id, id);
  }
}
