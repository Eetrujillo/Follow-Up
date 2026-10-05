import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../auth/password';
import { CreateUserDto } from './dto/create-user.dto';
import { rethrowPrismaError } from '../prisma/prisma-error';

export type PublicUser = {
  id: string;
  fullName: string;
  email: string;
  createdAt: Date;
};

function toPublicUser(user: PublicUser): PublicUser {
  const { id, fullName, email, createdAt } = user;
  return { id, fullName, email, createdAt };
}

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) throw new ConflictException('El correo electrónico ya está registrado');

    try {
      const user = await this.prisma.user.create({
        data: {
          id: randomUUID(),
          fullName: dto.fullName,
          email: dto.email,
          passwordHash: await hashPassword(dto.password),
        },
        select: { id: true, fullName: true, email: true, createdAt: true },
      });
      return toPublicUser(user);
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  async findOne(id: string): Promise<PublicUser> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: { id: true, fullName: true, email: true, createdAt: true },
      });
      if (!user) throw new NotFoundException('Usuario no encontrado');
      return toPublicUser(user);
    } catch (error) {
      rethrowPrismaError(error);
    }
  }

  findCredentialsByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });
  }
}
