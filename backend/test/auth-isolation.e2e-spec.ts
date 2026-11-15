import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Multi-user isolation contract.
 *
 * Every assertion here is an observable effect of one rule: a request acts on the
 * user that owns the bearer token, and on nobody else. The suite talks to the app
 * through HTTP only, never through the services, so a fix that works in a unit
 * test but not over the wire still fails here.
 */
describe('per-user isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const PASSWORD = 'password123';

  const server = () => app.getHttpServer();

  async function register(email: string): Promise<string> {
    await request(server())
      .post('/api/auth/register')
      .send({ fullName: `User ${email}`, email, password: PASSWORD })
      .expect(201);

    const login = await request(server())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD })
      .expect(201);

    return login.body.access_token as string;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    // Cascades remove tasks and events, so the suite starts from zero every time.
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await app.close();
  });

  describe('without a token', () => {
    it('refuses every task and calendar operation', async () => {
      const task = { description: 'should never exist' };

      await request(server()).get('/api/tasks').expect(401);
      await request(server()).post('/api/tasks').send(task).expect(401);
      await request(server()).patch('/api/tasks/00000000-0000-0000-0000-000000000000').send(task).expect(401);
      await request(server()).delete('/api/tasks/00000000-0000-0000-0000-000000000000').expect(401);

      await request(server()).get('/api/calendar').expect(401);
      await request(server()).delete('/api/calendar/00000000-0000-0000-0000-000000000000').expect(401);

      // The rejected write must not have created anything.
      expect(await prisma.task.count()).toBe(0);
    });
  });

  describe('with two independent users', () => {
    it('keeps tasks of one user out of the other listing', async () => {
      const alice = await register('alice@example.com');
      const bob = await register('bob@example.com');

      await request(server())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${alice}`)
        .send({ description: 'alice private task' })
        .expect(201);

      const aliceList = await request(server())
        .get('/api/tasks')
        .set('Authorization', `Bearer ${alice}`)
        .expect(200);
      expect(aliceList.body).toHaveLength(1);
      expect(aliceList.body[0].description).toBe('alice private task');

      const bobList = await request(server())
        .get('/api/tasks')
        .set('Authorization', `Bearer ${bob}`)
        .expect(200);
      expect(bobList.body).toHaveLength(0);
    });

    it("refuses to modify another user's task and leaves it untouched", async () => {
      const alice = await register('alice@example.com');
      const bob = await register('bob@example.com');

      const created = await request(server())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${alice}`)
        .send({ description: 'original' })
        .expect(201);
      const taskId = created.body.id as string;

      await request(server())
        .patch(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${bob}`)
        .send({ description: 'hijacked', isCompleted: true })
        .expect(404);

      const after = await request(server())
        .get('/api/tasks')
        .set('Authorization', `Bearer ${alice}`)
        .expect(200);
      expect(after.body).toHaveLength(1);
      expect(after.body[0].description).toBe('original');
      expect(after.body[0].isCompleted).toBe(false);
    });

    it("refuses to delete another user's task and keeps it alive", async () => {
      const alice = await register('alice@example.com');
      const bob = await register('bob@example.com');

      const created = await request(server())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${alice}`)
        .send({ description: 'keep me' })
        .expect(201);
      const taskId = created.body.id as string;

      await request(server())
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${bob}`)
        .expect(404);

      const after = await request(server())
        .get('/api/tasks')
        .set('Authorization', `Bearer ${alice}`)
        .expect(200);
      expect(after.body).toHaveLength(1);
      expect(after.body[0].id).toBe(taskId);
    });

    it('keeps calendar events of one user out of the other listing', async () => {
      const alice = await register('alice@example.com');
      const bob = await register('bob@example.com');

      const today = new Date();
      const created = await request(server())
        .post('/api/calendar')
        .set('Authorization', `Bearer ${alice}`)
        .send({
          title: 'alice private event',
          day: today.getDate(),
          month: today.getMonth() + 1,
          year: today.getFullYear(),
        })
        .expect(201);
      const eventId = created.body.id as string;

      const bobList = await request(server())
        .get('/api/calendar')
        .set('Authorization', `Bearer ${bob}`)
        .expect(200);
      expect(bobList.body).toHaveLength(0);

      await request(server())
        .delete(`/api/calendar/${eventId}`)
        .set('Authorization', `Bearer ${bob}`)
        .expect(404);

      const aliceList = await request(server())
        .get('/api/calendar')
        .set('Authorization', `Bearer ${alice}`)
        .expect(200);
      expect(aliceList.body).toHaveLength(1);
      expect(aliceList.body[0].title).toBe('alice private event');
    });
  });
});
