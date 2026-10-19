import {
  ConflictException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function rethrowPrismaError(error: unknown): never {
  if (error instanceof HttpException) {
    throw error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      throw new ConflictException('El recurso ya existe');
    }

    if (error.code === 'P2025') {
      throw new NotFoundException('El recurso no existe');
    }
  }

  throw new InternalServerErrorException('No se pudo completar la operación');
}