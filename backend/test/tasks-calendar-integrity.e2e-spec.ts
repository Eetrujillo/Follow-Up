import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Task and calendar behaviour that does not depend on who is asking.
 *
 * `auth-isolation` proves a request only touches the owner's rows; this file
 * proves the rows themselves stay consistent: a date that exists on a calendar,
 * an event and its linked task removed together, a completion timestamp, and an
 * `origin` the server owns instead of the client.
 */
describe('task and calendar integrity (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const PASSWORD = 'password123';

  const server = () => app.getHttpServer();

  async function token(): Promise<string> {
    const email = 'integrity@example.com';
    await request(server())
      .post('/api/auth/register')
      .send({ fullName: 'Integrity User', email, password: PASSWORD })
      .expect(201);

    const login = await request(server())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD })
      .expect(201);

    return login.body.access_token as string;
  }

  function createEvent(auth: string, body: Record<string, unknown>) {
    return request(server()).post('/api/calendar').set('Authorization', `Bearer ${auth}`).send(body);
  }

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

  describe('calendar dates', () => {
    it('rejects a day that does not exist in the requested month', async () => {
      const auth = await token();

      await createEvent(auth, { title: 'February 31st', day: 31, month: 2, year: 2026 }).expect(400);

      // A rejected date must not leave a half-written event or its task behind.
      expect(await prisma.calendarEvent.count()).toBe(0);
      expect(await prisma.task.count()).toBe(0);
    });

    it('stores the event and its task at UTC midnight of the requested day', async () => {
      const auth = await token();

      // The suite runs with TZ=America/Lima (`npm run test:e2e`) on purpose: on a
      // UTC host, local-time construction would produce this same value and the
      // regression this test exists for would pass unnoticed.

      const response = await createEvent(auth, {
        title: 'Mid month',
        day: 15,
        month: 3,
        year: 2026,
      }).expect(201);

      expect(response.body.eventDate).toBe('2026-03-15T00:00:00.000Z');
      expect(response.body.Task.dueDate).toBe('2026-03-15T00:00:00.000Z');
    });
  });

  describe('event and task lifetime', () => {
    it('removes the event when its linked task is deleted', async () => {
      const auth = await token();
      const created = await createEvent(auth, {
        title: 'Linked reminder',
        day: 10,
        month: 5,
        year: 2026,
      }).expect(201);

      await request(server())
        .delete(`/api/tasks/${created.body.linkedTaskId}`)
        .set('Authorization', `Bearer ${auth}`)
        .expect(200);

      // A reminder whose task is gone is a broken row: both must disappear.
      expect(await prisma.calendarEvent.count()).toBe(0);
      expect(await prisma.task.count()).toBe(0);
    });

    it('removes the linked task when the event is deleted', async () => {
      const auth = await token();
      const created = await createEvent(auth, {
        title: 'Cancelled reminder',
        day: 11,
        month: 5,
        year: 2026,
      }).expect(201);

      await request(server())
        .delete(`/api/calendar/${created.body.id}`)
        .set('Authorization', `Bearer ${auth}`)
        .expect(200);

      expect(await prisma.task.count()).toBe(0);
    });
  });

  describe('task completion', () => {
    it('stamps completedAt once and clears it when the task is reopened', async () => {
      const auth = await token();

      const created = await request(server())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${auth}`)
        .send({ description: 'Finish the audit' })
        .expect(201);
      expect(created.body.completedAt).toBeNull();

      const completed = await request(server())
        .patch(`/api/tasks/${created.body.id}`)
        .set('Authorization', `Bearer ${auth}`)
        .send({ isCompleted: true })
        .expect(200);
      expect(typeof completed.body.completedAt).toBe('string');

      // Patching the same value again must not move the timestamp: it records
      // when the task became completed, not when it was last touched.
      const again = await request(server())
        .patch(`/api/tasks/${created.body.id}`)
        .set('Authorization', `Bearer ${auth}`)
        .send({ isCompleted: true })
        .expect(200);
      expect(again.body.completedAt).toBe(completed.body.completedAt);

      const reopened = await request(server())
        .patch(`/api/tasks/${created.body.id}`)
        .set('Authorization', `Bearer ${auth}`)
        .send({ isCompleted: false })
        .expect(200);
      expect(reopened.body.completedAt).toBeNull();
    });
  });

  describe('client-supplied fields', () => {
    it('ignores an origin sent by the client', async () => {
      const auth = await token();

      const created = await request(server())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${auth}`)
        .send({ description: 'Pretend calendar task', origin: 'CALENDAR' })
        .expect(201);

      // A calendar task without a calendar event is a row no page can explain.
      expect(created.body.origin).toBe('DASHBOARD');
      expect(await prisma.calendarEvent.count()).toBe(0);
    });

    it('rejects a task description longer than the accepted limit', async () => {
      const auth = await token();

      await request(server())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${auth}`)
        .send({ description: 'x'.repeat(2001) })
        .expect(400);

      expect(await prisma.task.count()).toBe(0);
    });

    it('rejects a whitespace-only name on registration', async () => {
      await request(server())
        .post('/api/auth/register')
        .send({ fullName: '   ', email: 'blank@example.com', password: PASSWORD })
        .expect(400);

      expect(await prisma.user.count()).toBe(0);
    });
  });
});
