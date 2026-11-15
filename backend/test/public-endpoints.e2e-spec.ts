import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * What an anonymous caller is allowed to reach.
 *
 * There must be exactly one way to create an account and exactly one way to read
 * the current profile. The duplicate `POST /users` and the public `GET /users/:id`
 * answered without a token and are gone; this suite is what keeps them gone.
 */
describe('anonymous surface (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const server = () => app.getHttpServer();
  const credentials = { fullName: 'Anon User', email: 'anon@example.com', password: 'password123' };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await app.close();
  });

  it('exposes no user collection to anonymous callers', async () => {
    await request(server()).post('/api/users').send(credentials).expect(404);
    await request(server()).get('/api/users/00000000-0000-0000-0000-000000000000').expect(404);

    // The rejected calls must not have created anybody.
    expect(await prisma.user.count()).toBe(0);
  });

  it('registers through the documented route', async () => {
    const created = await request(server()).post('/api/auth/register').send(credentials).expect(201);

    expect(created.body.user.email).toBe(credentials.email);
    expect(created.body.user).not.toHaveProperty('passwordHash');
    expect(await prisma.user.count()).toBe(1);
  });

  it('answers the profile only with a token', async () => {
    await request(server()).get('/api/auth/me').expect(401);

    await request(server()).post('/api/auth/register').send(credentials).expect(201);
    const login = await request(server())
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(201);

    const me = await request(server())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.access_token}`)
      .expect(200);

    expect(me.body.email).toBe(credentials.email);
  });
});
