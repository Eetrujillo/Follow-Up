# api-migration

Migrate the Follow-Up frontend from a remote jsonbin/localStorage mock to the real
NestJS API, and make the API actually enforce authentication and per-user isolation.
Branch: `feat/api-migration`.

## Specs

- **S1** — The frontend must authenticate against the real backend (`POST /auth/login`,
  `POST /auth/register`) and send the issued JWT as `Authorization: Bearer <token>` on
  every backend call. Source: user selected the option whose text was
  "Login + tareas + calendario contra la API, borrando JsonbinService y el auth local."
- **S2** — Every protected backend route must reject an anonymous request with `401`.
  Only `GET /`, `POST /auth/register` and `POST /auth/login` are public. Source: user
  selected "Cerrar la autenticación de verdad"; the observed defect was
  `GET /tasks` and `GET /calendar` returning `200` with no token.
- **S3** — Records must belong to the authenticated user. No service may pick an
  arbitrary record owner. Source: same decision; the observed defect was
  `TasksService.getDefaultUserId()` and `CalendarService.getDefaultUserId()` running
  `findFirst({ orderBy: { createdAt: 'asc' } })`, so every user shared one account.
- **S4** — Passwords must never be stored or compared in plaintext in the browser or in
  a remote JSON store. Source: same decision; observed in
  `frontend/src/app/shared/services/user.service.ts` (`u.password === password`) and
  `frontend/src/app/shared/services/jsonbin.service.ts`.
- **S5** — Tasks and calendar must persist in PostgreSQL through the API, not in
  `localStorage`. Source: same decision; observed localStorage keys
  `tasks_user_*` (`task.ts`) and `calendar_events` (`calendar.ts`).
- **S6** — No hardcoded credential may remain in the frontend source or bundled output
  for the code this feature owns (`jsonbin` master key, Cohere key). Source: the user
  said "arregla todo" about the reported leaks.
- **S7** — The route guard must reflect a real session, not a client-writable flag.
  Source: same decision; observed `auth-guard.ts` checking
  `localStorage.getItem('isLoggedIn') === 'true'`.
- **S8** — Request validation must actually run. A malformed body must answer `400` with
  the field errors, never reach the service, and never produce `500`. Source: observed
  `POST /auth/register` with an invalid body returning `500`
  (`{"message":"No se pudo completar la operación"}`) because the `start` script runs
  `tsx src/main.ts` and esbuild does not emit `emitDecoratorMetadata`, so the global
  `ValidationPipe` never validates.

Out of scope for this feature (requires implementing four CLI stub modules from scratch
and was not part of the selected option): migrating `library`, `notepad` and
`statistics` to the backend. Those keep their current localStorage behavior.

## Tasks

| ID | Spec | Task | Route | Commit |
|----|------|------|-------|--------|
| T1 | S2 | Add `backend/test/auth.e2e.test.mjs` using `node --test`: anonymous `GET /tasks`, `GET /calendar`, `GET /users/:id` must be `401`; `GET /` and a bad `POST /auth/login` keep their current status; an invalid `POST /auth/register` must be `400`. Observe it fail first. | inline | |
| T1b | S8 | Backend: run the app through a metadata-aware compiler (`nest start`) instead of `tsx`, after proving `node dist/src/main.js` validates and `tsx` does not. | inline | `65a9261` |
| T2 | S2 | Backend: `@Public()` decorator + `JwtAuthGuard` as `APP_GUARD` in `AppModule`; mark `GET /`, `auth/register`, `auth/login` public. | inline | |
| T3 | S3 | Backend: `TasksService` and `CalendarService` take `userId` as a parameter; controllers pass the token user; delete `getDefaultUserId()`. | inline | `65a9261` |
| T4 | S2,S3 | Backend: scope `UsersController`: `GET /users/:id` only for self; decide `POST /users` (duplicate of register). | inline | `65a9261` |
| T5 | S1,S7 | Frontend: `authInterceptor` attaching the Bearer token, registered in `app.config.ts`. | inline | `c172453` |
| T6 | S1,S4,S7 | Frontend: `Login`, `Signup` and `authGuard` use `AuthApiService`; guard resolves the session through `GET /auth/me`. | inline | `c172453` |
| T7 | S5 | Frontend: `TaskService` and calendar read/write through `TasksApiService` and `CalendarApiService`; remove localStorage persistence for them. | inline | `17dab49` |
| T8 | S4,S6 | Delete `JsonbinService`, `UserService`, `jsonbin` usage, `db.json` and the `json-server` script; remove the hardcoded Cohere key from `ai.service.ts`. | inline | `17dab49` |
| T9 | S1-S8 | Verify: `node --test` green, both builds exit 0, two-user isolation, cleanup. | inline | `cf7acd4` |

## Log

- L1 (user, verbatim): "vale entonecs primero arreglemos ala parte de los errores que
  acabaste de encontrar y ya iniciamos con lo que voy a necesitar arregla todo me dijiste
  anteriormente"
- L2 (user, verbatim): "vamos a trabajar en el poyecto del follo-up"
- L3 (decision): user picked "Cerrar la autenticación de verdad" over registering the
  orphan modules, the original need, or moving the Cohere call.
- L4 (decision): user picked "Migración completa del frontend" over the login-only slice
  and the backend-only slice.
- L5 (finding): the frontend never called the API. `AuthApiService`, `UsersApiService`,
  `TasksApiService` and `CalendarApiService` have zero consumers; the live login path is
  `Login -> AuthService -> UserService -> JsonbinService -> api.jsonbin.io` with plaintext
  passwords, and a jsonbin **master key** is hardcoded at `jsonbin.service.ts:26`.
- L6 (finding): `documents`, `folders`, `notepad` and `stats` are unregistered Nest CLI
  stubs returning string literals, so they cannot serve `library`, `notepad` or
  `statistics`.
- L7 (finding): migration drift. `prisma/migrations/20260826203759_init/migration.sql`
  creates only `user` and `Folder`, while the live database has
  `CalendarEvent, Document, Folder, NotepadDraft, StatsStreak, Task, User`; the extra
  tables were created outside migrations.
- L8 (finding): no backend test runner exists (`backend/package.json` has no `test`
  script). T1 uses Node's built-in `node --test`, so no dependency is added.
- L9 (delivery): this branch is stacked. `feat/api-migration` sits on top of the pushed
  `chore/repo-hygiene`, so the review slice for a PR here is only the commit added on
  top of that base, never the 35k generated-line deletions that belong to the base
  branch. Delivery is two chained PRs: `chore/repo-hygiene` -> `main`, then
  `feat/api-migration` -> `chore/repo-hygiene`.
- L11 (evidence): isolation was proven through the public HTTP interface with two
  throwaway users on a fresh instance: 13/13 checks, including A creates a task that B
  cannot list (0 rows), patch (404) or delete (404), and B reading A's user (403). The
  four test users from both runs were deleted with Prisma and a login for a removed
  user answers 401 again. Slice boundary: `c172453` + `b3d8a10` (auth), `17dab49` +
  `cf7acd4` (data).
- L12 (limitation): the frontend was verified by build and by the API contract, not by
  driving a browser. Login -> dashboard -> create/edit task -> calendar CRUD is the
  remaining manual check, and `ng test` was not run (no Karma browser configured here);
  `task.spec.ts` and `storage.spec.ts` may need updating for the new TaskService.
- L13 (limitation): `library`, `notepad` and `statistics` still use localStorage, and
  AI task generation is disabled until a backend endpoint exists, by explicit scope.
