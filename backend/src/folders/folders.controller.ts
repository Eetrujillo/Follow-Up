import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PublicUser } from '../users/users.service';

@Controller('folders')
export class FoldersController {
  constructor(@Inject(FoldersService) private readonly foldersService: FoldersService) {}

  @Post()
  create(@CurrentUser() user: PublicUser, @Body() dto: CreateFolderDto) {
    return this.foldersService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: PublicUser) {
    return this.foldersService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: PublicUser, @Param('id') id: string) {
    return this.foldersService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: PublicUser,
    @Param('id') id: string,
    @Body() dto: UpdateFolderDto,
  ) {
    return this.foldersService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: PublicUser, @Param('id') id: string) {
    return this.foldersService.remove(user.id, id);
  }
}
