/**
 * Runs before any test module is imported, so PrismaService reads these values
 * when it builds its connection pool.
 *
 * The database is a throwaway container started by `npm run db:e2e:start`, never
 * the development or production one: the suite creates and deletes rows.
 */
const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgresql://followup:test@127.0.0.1:55432/followup_test?schema=public';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = E2E_DATABASE_URL;
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'e2e-secret-never-used-in-production';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '3600';
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:4200';
