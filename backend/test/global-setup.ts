import { execFileSync } from 'node:child_process';

const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgresql://followup:test@127.0.0.1:55432/followup_test?schema=public';

/**
 * Applies the shipped migrations to the throwaway database before the suite
 * runs. The point is to test the schema that actually deploys: a hand-written
 * test schema would hide a broken migration until production.
 */
export default function globalSetup(): void {
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
  });
}
