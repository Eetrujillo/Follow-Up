import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Credential endpoints are the only anonymous surface an attacker can drive, so
 * they must run out of budget. The limit comes from the same environment variable
 * the application reads, so this spec cannot drift from the configuration.
 */
describe('credential throttling (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const limit = Number(process.env.AUTH_THROTTLE_LIMIT);
  const server = () => app.getHttpServer();
  const badLogin = { email: 'nobody@example.com', password: 'wrong-password' };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await app.close();
  });

  it('answers 429 once the login budget is spent, and keeps register separate', async () => {
    expect(Number.isInteger(limit)).toBe(true);

    for (let attempt = 0; attempt < limit; attempt += 1) {
      await request(server()).post('/api/auth/login').send(badLogin).expect(401);
    }

    await request(server()).post('/api/auth/login').send(badLogin).expect(429);

    // Registration has its own budget: spending the login one must not block a
    // legitimate signup from the same address.
    await request(server())
      .post('/api/auth/register')
      .send({ fullName: 'Still Allowed', email: 'allowed@example.com', password: 'password123' })
      .expect(201);
  });

  it('buckets the budget per client IP behind the proxy, not per deployment', async () => {
    // The deployment sits behind the host nginx, so req.ip is only the real
    // client when trust proxy is configured; without it every visitor shares
    // one socket-address bucket and one attacker locks everybody out.
    const exhaustedClient = '203.0.113.10';

    for (let attempt = 0; attempt < limit; attempt += 1) {
      await request(server())
        .post('/api/auth/login')
        .set('X-Forwarded-For', exhaustedClient)
        .send(badLogin)
        .expect(401);
    }

    await request(server())
      .post('/api/auth/login')
      .set('X-Forwarded-For', exhaustedClient)
      .send(badLogin)
      .expect(429);

    // A different client keeps its own budget: one exhausted client must not
    // lock the rest of the world out of login.
    await request(server())
      .post('/api/auth/login')
      .set('X-Forwarded-For', '198.51.100.22')
      .send(badLogin)
      .expect(401);
  });
});
