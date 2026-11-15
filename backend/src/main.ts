import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // The HTTP surface lives in configureApp so the e2e suite boots the same app.
  configureApp(app);
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
