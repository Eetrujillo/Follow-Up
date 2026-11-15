import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersService } from './users.service';

/**
 * No controller on purpose. Registration is `POST /auth/register` and the profile
 * is `GET /auth/me`; a second public `POST /users` and a `GET /users/:id` that
 * answered with somebody's email were both reachable without a token.
 */
@Module({
  imports: [PrismaModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
