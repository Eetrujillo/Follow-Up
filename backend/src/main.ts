import 'reflect-metadata';
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Every route is mounted under /api. The prefix is not cosmetic: the SPA also
  // owns the /calendar route, so an unprefixed GET /calendar would be served by
  // the frontend and never reach the backend. nginx proxies /api/... here.
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:4200' });
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
