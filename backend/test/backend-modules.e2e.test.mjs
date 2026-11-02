import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';
const prisma = new PrismaClient();

const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const users = {
  a: { fullName: 'Audit A', email: `audit-a-${stamp}@example.com`, password: 'Auditoria123' },
  b: { fullName: 'Audit B', email: `audit-b-${stamp}@example.com`, password: 'Auditoria123' },
};

const tokens = {};
const ids = { folderA: null, folderNotes: null, documentA: null };
let available = false;

async function request(path, { token, ...init } = {}) {
  const headers = { ...(init.headers ?? {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${BASE_URL}${path}`, { ...init, headers });
}

async function body(res) {
  return res.json().catch(() => null);
}

function jsonRequest(method, payload) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

before(async () => {
  try {
    const health = await request('/');
    available = health.status === 200;
  } catch {
    available = false;
  }
  if (!available) return;

  for (const [key, user] of Object.entries(users)) {
    const res = await request('/auth/register', jsonRequest('POST', user));
    assert.equal(res.status, 201, `register ${key}`);
    tokens[key] = (await body(res)).token;
  }
});

after(async () => {
  if (available) {
    await prisma.user.deleteMany({
      where: { email: { in: Object.values(users).map((user) => user.email) } },
    });
  }
  await prisma.$disconnect();
});

function skip(t) {
  if (!available) return t.skip('backend no disponible');
  return false;
}

describe('las rutas nuevas exigen token', () => {
  for (const path of ['/folders', '/documents', '/notepad', '/stats/streak']) {
    it(`GET ${path} -> 401 sin token`, async (t) => {
      if (skip(t)) return;
      const res = await request(path);
      assert.equal(res.status, 401);
    });
  }
});

describe('folders', () => {
  it('crea, lee y actualiza una carpeta del usuario', async (t) => {
    if (skip(t)) return;

    const created = await request('/folders', { token: tokens.a, ...jsonRequest('POST', { name: 'Carpeta A' }) });
    assert.equal(created.status, 201);
    const folder = await body(created);
    assert.ok(folder.id);
    assert.equal(folder.name, 'Carpeta A');
    assert.equal(folder.isNotesFolder, false);
    ids.folderA = folder.id;

    const notes = await request(
      '/folders',
      { token: tokens.a, ...jsonRequest('POST', { name: 'Mis Notas', isNotesFolder: true }) },
    );
    assert.equal(notes.status, 201);
    const notesFolder = await body(notes);
    assert.equal(notesFolder.isNotesFolder, true);
    ids.folderNotes = notesFolder.id;

    const read = await request(`/folders/${folder.id}`, { token: tokens.a });
    assert.equal(read.status, 200);
    assert.equal((await body(read)).name, 'Carpeta A');

    const updated = await request(
      `/folders/${folder.id}`,
      { token: tokens.a, ...jsonRequest('PATCH', { name: 'Carpeta A editada' }) },
    );
    assert.equal(updated.status, 200);
    assert.equal((await body(updated)).name, 'Carpeta A editada');
  });

  it('aísla las carpetas por usuario', async (t) => {
    if (skip(t)) return;

    const list = await request('/folders', { token: tokens.b });
    assert.equal(list.status, 200);
    assert.equal((await body(list)).length, 0);

    const foreign = await request(`/folders/${ids.folderA}`, { token: tokens.b });
    assert.equal(foreign.status, 404);
  });
});

describe('documents', () => {
  it('exige que la carpeta pertenezca al usuario', async (t) => {
    if (skip(t)) return;

    const res = await request(
      '/documents',
      { token: tokens.b, ...jsonRequest('POST', { folderId: ids.folderA, title: 'Intruso' }) },
    );
    assert.equal(res.status, 404);
  });

  it('crea, filtra, actualiza y elimina documentos', async (t) => {
    if (skip(t)) return;

    const created = await request(
      '/documents',
      {
        token: tokens.a,
        ...jsonRequest('POST', {
          folderId: ids.folderA,
          title: 'Doc A',
          contentHtml: '<p>hola</p>',
        }),
      },
    );
    assert.equal(created.status, 201);
    const document = await body(created);
    assert.ok(document.id);
    assert.equal(document.folderId, ids.folderA);
    assert.equal(document.title, 'Doc A');
    assert.equal(document.contentHtml, '<p>hola</p>');
    assert.equal(document.fromNotepad, false);
    assert.ok(document.updatedAt);
    ids.documentA = document.id;

    const filtered = await request(`/documents?folderId=${ids.folderA}`, { token: tokens.a });
    assert.equal(filtered.status, 200);
    assert.deepEqual((await body(filtered)).map((item) => item.id), [document.id]);

    const updated = await request(
      `/documents/${document.id}`,
      { token: tokens.a, ...jsonRequest('PATCH', { title: 'Doc A editado', fromNotepad: true }) },
    );
    assert.equal(updated.status, 200);
    const edited = await body(updated);
    assert.equal(edited.title, 'Doc A editado');
    assert.equal(edited.fromNotepad, true);

    const foreign = await request(`/documents/${document.id}`, { token: tokens.b });
    assert.equal(foreign.status, 404);

    const removed = await request(`/documents/${document.id}`, { token: tokens.a, method: 'DELETE' });
    assert.equal(removed.status, 200);
    const gone = await request(`/documents/${document.id}`, { token: tokens.a });
    assert.equal(gone.status, 404);
  });
});

describe('notepad', () => {
  it('guarda un borrador por usuario', async (t) => {
    if (skip(t)) return;

    const empty = await request('/notepad', { token: tokens.a });
    assert.equal(empty.status, 200);
    assert.equal((await body(empty)).contentHtml, '');

    const saved = await request(
      '/notepad',
      { token: tokens.a, ...jsonRequest('PUT', { contentHtml: '<p>borrador</p>' }) },
    );
    assert.equal(saved.status, 200);
    assert.equal((await body(saved)).contentHtml, '<p>borrador</p>');

    const read = await request('/notepad', { token: tokens.a });
    assert.equal((await body(read)).contentHtml, '<p>borrador</p>');

    const other = await request('/notepad', { token: tokens.b });
    assert.equal((await body(other)).contentHtml, '');

    const removed = await request('/notepad', { token: tokens.a, method: 'DELETE' });
    assert.equal(removed.status, 200);
    assert.equal((await body(removed)).deleted, true);

    const afterRemove = await request('/notepad', { token: tokens.a });
    assert.equal((await body(afterRemove)).contentHtml, '');
  });
});

describe('stats', () => {
  it('persiste la racha y no la duplica el mismo día', async (t) => {
    if (skip(t)) return;

    const initial = await request('/stats/streak', { token: tokens.a });
    assert.equal(initial.status, 200);
    assert.equal((await body(initial)).currentStreakDays, 0);

    const first = await request('/stats/visit', { token: tokens.a, method: 'POST' });
    assert.equal(first.status, 201);
    const firstBody = await body(first);
    assert.equal(firstBody.currentStreakDays, 1);
    assert.ok(firstBody.lastVisitDate);

    const second = await request('/stats/visit', { token: tokens.a, method: 'POST' });
    assert.equal(second.status, 201);
    assert.equal((await body(second)).currentStreakDays, 1);

    const read = await request('/stats/streak', { token: tokens.a });
    assert.equal((await body(read)).currentStreakDays, 1);

    const other = await request('/stats/visit', { token: tokens.b, method: 'POST' });
    assert.equal((await body(other)).currentStreakDays, 1);
  });
});
