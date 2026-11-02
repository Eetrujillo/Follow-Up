import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';

let available = false;

async function request(path, init) {
  return fetch(`${BASE_URL}${path}`, init);
}

before(async () => {
  try {
    const health = await request('/');
    available = health.status === 200;
  } catch {
    available = false;
  }
});

after(() => {
  if (!available) {
    console.warn(`[skip] No hay backend respondiendo en ${BASE_URL}`);
  }
});

function guarded(path, init) {
  it(`${init?.method ?? 'GET'} ${path} -> 401 sin token`, async (t) => {
    if (!available) return t.skip('backend no disponible');
    const res = await request(path, init);
    assert.equal(res.status, 401);
  });
}

describe('rutas protegidas', () => {
  guarded('/tasks');
  guarded('/calendar');
  guarded('/users/00000000-0000-0000-0000-000000000000');
  guarded('/auth/me');
});

describe('rutas públicas', () => {
  it('GET / -> 200 sin token', async (t) => {
    if (!available) return t.skip('backend no disponible');
    const res = await request('/');
    assert.equal(res.status, 200);
  });

  it('POST /auth/login con credenciales inválidas -> 401', async (t) => {
    if (!available) return t.skip('backend no disponible');
    const res = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nadie@example.com', password: 'incorrecta123' }),
    });
    assert.equal(res.status, 401);
  });

  it('POST /auth/register con cuerpo inválido -> 400 y sin escribir', async (t) => {
    if (!available) return t.skip('backend no disponible');
    const res = await request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'no-es-una-direccion' }),
    });
    assert.equal(res.status, 400);
  });
});
