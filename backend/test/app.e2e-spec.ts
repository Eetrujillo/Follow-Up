import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Wiring test: proves the suite boots the same HTTP surface production serves.
 * If this file fails, every other e2e assertion is measuring the wrong app.
 */
describe('application wiring (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(async () => {
    await app.get(PrismaService).$disconnect();
    await app.close();
  });

  it('mounts every route under the /api prefix', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(404);
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('rejects a bearer token that was not signed by this app', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });
});
