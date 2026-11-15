# auth-multiuser

Feature: multi-user authorization for Follow-Up. The audit (`docs/auditoria-app.md`) found that every business endpoint resolves a "default user" instead of the authenticated one.

## Specs

**S1.** "si la app es multiusuario asi que ten en cuenta eso" — the application is multi-user. Every business endpoint must act on the user identified by the verified JWT, never on a user picked from the database. A user must not be able to read, modify or delete another user's rows, even knowing their ids.

**S2.** "en el md vas marcando en cual estas solucionando" — `docs/auditoria-app.md` carries the live status of each finding being fixed.

**S3.** "inica trabaja en local relaizas pruebas y despliegas" — work locally, prove it with tests, then deploy. No finding is marked fixed without a test that fails before the change and passes after it.

## Tasks

| ID | Task | Specs | Route | Commit |
|---|---|---|---|---|
| T1 | Backend test harness: runner, e2e bootstrap, isolated Postgres for tests | S1, S3 | inline | — |
| T2 | Cross-user isolation enforced from the JWT on tasks and calendar | S1, S3 | inline | — |
| T3 | Registration and profile endpoints closed per the multi-user model | S1, S3 | inline | — |
| T4 | Notepad HTML sanitized; token storage decision recorded | S3 | inline | — |
| T5 | Audit document status updated for every fixed finding | S2 | inline | — |
| T6 | Deploy to production and verify on the server | S3 | inline | — |

## Log

**L1** (user, verbatim): "si vamos a iniciar pero entonces necesito que crees el commmit e inicies y si la app es multiusuario asi que ten en cuenta eso y en el md vas marcando en cual estas solucionando inica trabaja en local relaizas pruebas y despliegas"

**L2** (decision, harness): the backend had no test runner at all. Jest + ts-jest + supertest is the NestJS path, but the freshly published jest 30 silently drops the ts-jest transform on Node 26, and the lockfile kept a nested `jest-util` that ts-jest requires from the root. Resolution: pin jest 29 (the version ts-jest 29 supports) and regenerate the lockfile. A test tsconfig (`tsconfig.test.json`) overrides `module` to CommonJS and adds the jest types, so the application tsconfig stays untouched.

**L3** (decision, test database): the e2e suite must never touch the development or production database. `test/e2e-db.sh` starts a disposable `postgres:16-alpine` container on 127.0.0.1:55432 and `test/global-setup.ts` applies the real Prisma migrations to it, so the suite tests the schema that ships.

**L4** (correction): audit finding M1 claimed the calendar DTO did not validate month/day ranges. `calendar/dto/create-calendar-event.dto.ts` does clamp them with `@Min`/`@Max`, so the overflow scenario is not reachable over HTTP. Only the timezone half of that finding stands; the document gets corrected in T5.
