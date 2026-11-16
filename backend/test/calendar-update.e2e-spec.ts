import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Editing a calendar event.
 *
 * An event and its task are one thing in two rows: the task carries the reminder's
 * description and due date. Editing only one of them is how the pair drifts apart,
 * so every assertion here checks both rows after the same HTTP call.
 */
describe('calendar event update (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const PASSWORD = 'password123';

  const server = () => app.getHttpServer();

  async function tokenFor(email: string): Promise<string> {
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

  async function createEvent(auth: string, body: Record<string, unknown>) {
    const response = await request(server())
      .post('/api/calendar')
      .set('Authorization', `Bearer ${auth}`)
      .send(body)
      .expect(201);

    return response.body as {
      id: string;
      title: string;
      colorHex: string;
      eventDate: string;
      linkedTaskId: string;
      Task: { id: string; description: string; dueDate: string };
    };
  }

  const patch = (auth: string, id: string, body: Record<string, unknown>) =>
    request(server()).patch(`/api/calendar/${id}`).set('Authorization', `Bearer ${auth}`).send(body);

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

  describe('renaming', () => {
    it('renames the linked task with the event and leaves the dates alone', async () => {
      const auth = await tokenFor('rename@example.com');
      const created = await createEvent(auth, {
        title: 'Standup',
        day: 15,
        month: 3,
        year: 2026,
      });

      const updated = await patch(auth, created.id, { title: 'Daily standup' }).expect(200);

      expect(updated.body.title).toBe('Daily standup');
      expect(updated.body.Task.description).toBe('Evento: Daily standup');
      expect(updated.body.eventDate).toBe('2026-03-15T00:00:00.000Z');
      expect(updated.body.Task.dueDate).toBe('2026-03-15T00:00:00.000Z');
    });

    it('changes the colour without touching the title or the task', async () => {
      const auth = await tokenFor('color@example.com');
      const created = await createEvent(auth, {
        title: 'Retro',
        colorHex: '#112233',
        day: 4,
        month: 6,
        year: 2026,
      });

      const updated = await patch(auth, created.id, { colorHex: '#aabbcc' }).expect(200);

      expect(updated.body.colorHex).toBe('#aabbcc');
      expect(updated.body.title).toBe('Retro');
      expect(updated.body.Task.description).toBe('Evento: Retro');
    });
  });

  describe('moving the date', () => {
    it('moves the event and the due date of its task together', async () => {
      const auth = await tokenFor('move@example.com');
      const created = await createEvent(auth, {
        title: 'Dentist',
        day: 15,
        month: 3,
        year: 2026,
      });

      const updated = await patch(auth, created.id, { day: 20, month: 3, year: 2026 }).expect(200);

      expect(updated.body.eventDate).toBe('2026-03-20T00:00:00.000Z');
      expect(updated.body.Task.dueDate).toBe('2026-03-20T00:00:00.000Z');

      // Both rows, not just the one the response was built from.
      const task = await prisma.task.findUnique({ where: { id: created.linkedTaskId } });
      expect(task?.dueDate?.toISOString()).toBe('2026-03-20T00:00:00.000Z');
    });

    it('rejects a date unit that arrives incomplete', async () => {
      const auth = await tokenFor('partial@example.com');
      const created = await createEvent(auth, {
        title: 'Partial',
        day: 15,
        month: 3,
        year: 2026,
      });

      // Half a date would mean guessing the other half.
      await patch(auth, created.id, { day: 20 }).expect(400);

      const event = await prisma.calendarEvent.findUnique({ where: { id: created.id } });
      expect(event?.eventDate.toISOString()).toBe('2026-03-15T00:00:00.000Z');
    });

    it('rejects a date that does not exist on the calendar', async () => {
      const auth = await tokenFor('fake@example.com');
      const created = await createEvent(auth, {
        title: 'Impossible',
        day: 15,
        month: 3,
        year: 2026,
      });

      await patch(auth, created.id, { day: 31, month: 2, year: 2026 }).expect(400);

      const task = await prisma.task.findUnique({ where: { id: created.linkedTaskId } });
      expect(task?.dueDate?.toISOString()).toBe('2026-03-15T00:00:00.000Z');
    });
  });

  describe('ownership', () => {
    it('answers 404 for another user event and leaves it untouched', async () => {
      const owner = await tokenFor('owner@example.com');
      const intruder = await tokenFor('intruder@example.com');
      const created = await createEvent(owner, {
        title: 'Private',
        day: 8,
        month: 7,
        year: 2026,
      });

      await patch(intruder, created.id, { title: 'Hijacked' }).expect(404);

      const event = await prisma.calendarEvent.findUnique({ where: { id: created.id } });
      expect(event?.title).toBe('Private');

      // The same request must succeed for the owner, otherwise the 404 above would
      // only prove that the route does not exist.
      await patch(owner, created.id, { title: 'Mine' }).expect(200);
    });

    it('refuses an update without a token', async () => {
      const owner = await tokenFor('notoken@example.com');
      const created = await createEvent(owner, {
        title: 'Guarded',
        day: 9,
        month: 7,
        year: 2026,
      });

      await request(server()).patch(`/api/calendar/${created.id}`).send({ title: 'Nope' }).expect(401);
    });
  });
});
