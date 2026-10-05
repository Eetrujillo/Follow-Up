import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}
