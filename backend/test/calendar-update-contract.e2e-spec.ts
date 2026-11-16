import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Contract edges of editing a calendar event.
 *
 * `calendar-update` covers the happy paths; this file covers what a body can do to
 * stored data when the client sends nothing useful: explicit nulls, half a date,
 * a link to somebody else's task, and a task update that fails mid-transaction.
 */
describe('calendar update contract (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const PASSWORD = 'password123';

  const server = () => app.getHttpServer();

  async function token(email: string): Promise<string> {
    await request(server())
      .post('/api/auth/register')
      .send({ fullName: `U ${email}`, email, password: PASSWORD })
      .expect(201);

    const login = await request(server())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD })
      .expect(201);

    return login.body.access_token as string;
  }

  const event = (auth: string, body: object) =>
    request(server()).post('/api/calendar').set('Authorization', `Bearer ${auth}`).send(body);

  const patch = (auth: string, id: string, body: object) =>
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
    await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS contract_fail_task ON "Task"');
    await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS contract_fail_task_fn()');
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await app.close();
  });

  it('rejects an all-null date and keeps both rows untouched', async () => {
    const auth = await token('nulls@example.com');
    const created = (await event(auth, { title: 'Keep', day: 15, month: 3, year: 2026 }).expect(201))
      .body;

    await patch(auth, created.id, { day: null, month: null, year: null }).expect(400);

    // `Date.UTC(null, null - 1, null)` is 1899-11-30: a silent corruption of both
    // rows is worse than a rejected request.
    const row = await prisma.calendarEvent.findUnique({ where: { id: created.id } });
    const task = await prisma.task.findUnique({ where: { id: created.linkedTaskId } });
    expect(row?.eventDate.toISOString()).toBe('2026-03-15T00:00:00.000Z');
    expect(task?.dueDate?.toISOString()).toBe('2026-03-15T00:00:00.000Z');
  });

  it('answers 400, not 500, to a null title or colour', async () => {
    const auth = await token('nullfield@example.com');
    const created = (await event(auth, { title: 'Nulls', day: 15, month: 3, year: 2026 }).expect(201))
      .body;

    await patch(auth, created.id, { title: null }).expect(400);
    await patch(auth, created.id, { colorHex: null }).expect(400);

    const row = await prisma.calendarEvent.findUnique({ where: { id: created.id } });
    expect(row?.title).toBe('Nulls');
    expect(row?.colorHex).toBe('#3B82F6');
  });

  it('states the two date messages exactly', async () => {
    const auth = await token('msgs@example.com');
    const created = (await event(auth, { title: 'Msgs', day: 15, month: 3, year: 2026 }).expect(201))
      .body;

    const partial = await patch(auth, created.id, { day: 20 }).expect(400);
    expect(partial.body.message).toContain('day, month y year deben enviarse juntos');

    const impossible = await patch(auth, created.id, {
      day: 31,
      month: 2,
      year: 2026,
    }).expect(400);
    expect(impossible.body.message).toContain('El día no existe en el mes indicado');
  });

  it('edits an event without a linked task and creates none', async () => {
    const auth = await token('nolink@example.com');
    const me = await prisma.user.findUnique({ where: { email: 'nolink@example.com' } });

    await prisma.calendarEvent.create({
      data: {
        id: 'no-link-1',
        userId: me!.id,
        title: 'Manual',
        colorHex: '#123456',
        eventDate: new Date(Date.UTC(2026, 2, 15)),
      },
    });

    await patch(auth, 'no-link-1', { title: 'Manual 2', day: 20, month: 3, year: 2026 }).expect(200);

    expect(await prisma.task.count()).toBe(0);
    const row = await prisma.calendarEvent.findUnique({ where: { id: 'no-link-1' } });
    expect(row?.eventDate.toISOString()).toBe('2026-03-20T00:00:00.000Z');
  });

  it('keeps the event unchanged when the task update fails', async () => {
    const auth = await token('rollback@example.com');
    const created = (await event(auth, { title: 'Keep', day: 15, month: 3, year: 2026 }).expect(201))
      .body;

    await prisma.$executeRawUnsafe(
      `CREATE OR REPLACE FUNCTION contract_fail_task_fn() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'forced'; END; $$ LANGUAGE plpgsql`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER contract_fail_task BEFORE UPDATE ON "Task" FOR EACH ROW EXECUTE FUNCTION contract_fail_task_fn()`,
    );

    try {
      await patch(auth, created.id, { title: 'Changed', day: 20, month: 3, year: 2026 }).expect(500);
    } finally {
      await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS contract_fail_task ON "Task"');
    }

    // One reminder in two rows: if the task cannot move, the event must not move.
    const row = await prisma.calendarEvent.findUnique({ where: { id: created.id } });
    expect(row?.title).toBe('Keep');
    expect(row?.eventDate.toISOString()).toBe('2026-03-15T00:00:00.000Z');
  });

  it('never rewrites a task owned by another user', async () => {
    const owner = await token('x-owner@example.com');
    const other = await token('x-other@example.com');

    const victim = (
      await request(server())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${other}`)
        .send({ description: 'Victim', dueDate: '2026-04-01T00:00:00.000Z' })
        .expect(201)
    ).body;

    const created = (await event(owner, { title: 'Cross', day: 15, month: 3, year: 2026 }).expect(201))
      .body;

    // Only reachable by editing the database by hand; the service must still stay
    // inside the caller's tenant when the link points somewhere else.
    await prisma.$executeRawUnsafe('UPDATE "Task" SET "dueDate" = NULL WHERE id = $1', created.linkedTaskId);
    await prisma.$executeRawUnsafe(
      'UPDATE "CalendarEvent" SET "linkedTaskId" = $1 WHERE id = $2',
      victim.id,
      created.id,
    );

    await patch(owner, created.id, { title: 'Hijack', day: 20, month: 3, year: 2026 }).expect(200);

    const row = await prisma.task.findUnique({ where: { id: victim.id } });
    expect(row?.description).toBe('Victim');
    expect(row?.dueDate?.toISOString()).toBe('2026-04-01T00:00:00.000Z');
  });

  it('leaves dates and task alone on a colour-only patch, read back from the DB', async () => {
    const auth = await token('coloronly@example.com');
    const created = (
      await event(auth, { title: 'Retro', colorHex: '#112233', day: 4, month: 6, year: 2026 }).expect(
        201,
      )
    ).body;

    await patch(auth, created.id, { colorHex: '#aabbcc' }).expect(200);

    const row = await prisma.calendarEvent.findUnique({ where: { id: created.id } });
    const task = await prisma.task.findUnique({ where: { id: created.linkedTaskId } });
    expect(row?.colorHex).toBe('#aabbcc');
    expect(row?.eventDate.toISOString()).toBe('2026-06-04T00:00:00.000Z');
    expect(task?.description).toBe('Evento: Retro');
    expect(task?.dueDate?.toISOString()).toBe('2026-06-04T00:00:00.000Z');
  });

  it('rejects a month/year-only date instead of ignoring it', async () => {
    const auth = await token('half@example.com');
    const created = (await event(auth, { title: 'Half', day: 15, month: 3, year: 2026 }).expect(201))
      .body;

    // The trap: `day` is absent here, so the constraint has to run even when the
    // field is missing, otherwise this request would be a silent no-op.
    const partial = await patch(auth, created.id, { month: 3, year: 2026 }).expect(400);
    expect(partial.body.message).toContain('day, month y year deben enviarse juntos');

    await patch(auth, created.id, { year: null }).expect(400);
    await patch(auth, created.id, { day: '20', month: 3, year: 2026 } as unknown as object).expect(400);

    // And an empty body stays a legitimate no-op.
    await patch(auth, created.id, {}).expect(200);

    const row = await prisma.calendarEvent.findUnique({ where: { id: created.id } });
    const task = await prisma.task.findUnique({ where: { id: created.linkedTaskId } });
    expect(row?.eventDate.toISOString()).toBe('2026-03-15T00:00:00.000Z');
    expect(task?.dueDate?.toISOString()).toBe('2026-03-15T00:00:00.000Z');
  });
});
