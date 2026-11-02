import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';
const prisma = new PrismaClient();

const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const users = {
  a: { fullName: 'Filter A', email: `filter-a-${stamp}@example.com`, password: 'Auditoria123' },
  b: { fullName: 'Filter B', email: `filter-b-${stamp}@example.com`, password: 'Auditoria123' },
};

const tokens = {};
let eneroId = null;
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

describe('calendar', () => {
  it('filtra por mes y año, y actualiza un evento', async (t) => {
    if (!available) return t.skip('backend no disponible');

    const enero = await request(
      '/calendar',
      { token: tokens.a, ...jsonRequest('POST', { title: 'Enero', day: 15, month: 1, year: 2030 }) },
    );
    assert.equal(enero.status, 201);
    eneroId = (await body(enero)).id;

    const febrero = await request(
      '/calendar',
      { token: tokens.a, ...jsonRequest('POST', { title: 'Febrero', day: 10, month: 2, year: 2030 }) },
    );
    assert.equal(febrero.status, 201);

    const otroAnio = await request(
      '/calendar',
      { token: tokens.a, ...jsonRequest('POST', { title: 'Otro año', day: 5, month: 1, year: 2031 }) },
    );
    assert.equal(otroAnio.status, 201);

    const january = await request('/calendar?month=1&year=2030', { token: tokens.a });
    assert.equal(january.status, 200);
    assert.deepEqual((await body(january)).map((event) => event.title), ['Enero']);

    const year = await request('/calendar?year=2030', { token: tokens.a });
    assert.equal(year.status, 200);
    assert.deepEqual(
      (await body(year)).map((event) => event.title).sort(),
      ['Enero', 'Febrero'],
    );

    const all = await request('/calendar', { token: tokens.a });
    assert.equal((await body(all)).length, 3);

    const invalidMonth = await request('/calendar?month=13&year=2030', { token: tokens.a });
    assert.equal(invalidMonth.status, 400);

    const patched = await request(
      `/calendar/${eneroId}`,
      { token: tokens.a, ...jsonRequest('PATCH', { title: 'Enero editado' }) },
    );
    assert.equal(patched.status, 200);
    assert.equal((await body(patched)).title, 'Enero editado');

    const otherUser = await request('/calendar', { token: tokens.b });
    assert.equal((await body(otherUser)).length, 0);
  });
});
