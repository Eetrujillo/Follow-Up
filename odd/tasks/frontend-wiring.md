# frontend-wiring

Close the platform: persist `library`, `notepad` and `statistics` through the real backend API
(they were explicitly out of scope in `api-migration.md`), and fix the login error that only
appeared after touching a field.
Branch: `feat/frontend-wiring`, stacked on `fix/backend-modules`.

## Specs

- **S1** — "en el incio de sesion cuando se ingresa un correo o la contraseña erroneamente y
  luego se le da a el boton de inciar sesion se queda en cargando y hasta que se interactua con
  los campos de texto no muestra el error de que se ingreso uno de los datos mal". After a
  failed submit the view must show the error and re-enable the button with no further
  interaction. The application runs zoneless (Angular 21 defaults to it and `zone.js` is not
  loaded), so async state must be signals or explicitly marked for check.
- **S2** — Library must persist folders and documents in PostgreSQL through `GET/POST/PATCH/DELETE
  /folders` and `GET/POST/PATCH/DELETE /documents`, scoped to the authenticated user by the JWT.
  Nothing of the library may survive in `localStorage`.
- **S3** — Notepad must persist its draft through `GET /notepad` and `PUT /notepad` instead of
  `notepad_<user>` in `localStorage`, and "guardar en biblioteca" must go through
  `POST /documents` (the notes folder), not local state. `DELETE /notepad` stays exposed by
  `NotepadApiService` but has no UI action, because the page never had a clear button.
- **S4** — Statistics must read the streak from `GET /stats/streak` and register the visit with
  `POST /stats/visit` instead of `streak_<user>`/`last_visit_<email>`; totals and the weekly
  chart must be aggregated from `GET /tasks` and `GET /documents`. No new backend endpoint: the
  audit only asked for the four stub modules to be real, and they already are.
- **S5** — "completar los modulos falatantes dell backend y complemnetarlo con el front": the
  frontend pages must consume the existing backend modules; the backend keeps its current
  contract (no endpoint added, no response shape changed).

Out of scope: new backend endpoints, Railway secrets, the `.env`/history question of
`backend-modules.md`, and wiring `search`.

## Tasks

| ID | Spec | Task | Route | Commit (`frontend/` repo) |
|----|------|------|-------|--------|
| T1 | S1 | Login and signup state as signals, with component specs that pin the visible error and the re-enabled button. | inline | `9201853` |
| T2 | S2 | `FoldersApiService`, `DocumentsApiService` and `LibraryService` rewritten against the API (`folders$` replaced by a `folders` signal), plus the `textToHtml`/`htmlToText` helpers. | inline | `431739f` |
| T3 | S2 | Library page against `LibraryService` (string ids, error banner); the `localStorage` seed is gone. | inline | `431739f` |
| T4 | S3 | `NotepadApiService` and the notepad page (draft load, debounced upsert, notes-folder save-through). | inline | `f458272` |
| T5 | S4 | `StatsApiService`, streak and aggregates in the statistics page; the chart is fed from `createdAt`. | inline | `78aad1a` |
| T6 | S1 | Same zoneless defect in the app shell (`showSidebar` written from `router.events`), plus the stale `App`/`Sidebar` specs that failed before this feature. | inline | `3f6f05b` |
| T7 | S1-S5 | Verify: `ng test`, `ng build`, `npm test` (backend), `npm run build` (backend), and the per-user isolation the backend suite already asserts for folders/documents/notepad. | inline | |

Slice boundaries: `9201853` and `3f6f05b` are the two halves of the S1 fix; `431739f` is the
larger unit (~435 authored lines) because the service and the page must land together (the page
consumed `folders$` and the old numeric ids, so a services-only commit would not compile);
`f458272` and `78aad1a` are one page each.

## Log

- L1 (user, verbatim): "necesito hacer completar los modulos falatantes dell backend y
  complemnetarlo con el front y un arreglo es que en el incio de sesion cuando se ingresa un
  correo o la contraseña erroneamente y luego se le da a el boton de inciar sesion se queda en
  cargando y hasta que se interactua con los campos de texto no muestra el error de que se
  ingreso uno de los datos mal lista lo que tines que hacer e inicia"
- L2 (evidence, login root cause): the frontend has no `zone.js` polyfill and `app.config.ts`
  provides no change-detection provider; Angular 21 applies
  `provideZonelessChangeDetectionInternal()` by default (`@angular/core/fesm2022/core.mjs:723`).
  A field written inside an `HttpClient` subscription schedules no tick, so the view kept
  `Cargando...` until a DOM event (typing) marked the view dirty.
- L3 (evidence, no unit RED for T1): `TestBed` is zoneless too and defaults to
  `autoDetect = true` (`@angular/core/fesm2022/testing.mjs:164`), so the fixture re-renders even
  for plain fields; a probe spec proved both a plain field and a signal reached the DOM after
  `whenStable()`. The T1 specs are therefore regression pins, not a reproduced RED; the
  mechanism is pinned by code review against the framework source above.

- L4 (evidence, routing): `gentle-ai-worker` refused the T4/T5 launch ("Writers run only for a
  task of an existing ODD feature document (`Spec: odd/tasks/<feature>.md, T<n>` in the task)"),
  so both units were written inline by the parent. The task document and its `T4`/`T5` rows
  existed before the launch; the refusal is recorded here rather than retried.
- L5 (evidence, layout): `frontend/` is a git submodule (`.gitmodules` ->
  `git@github.com:Eetrujillo/Follow_Up.git`), so the five commits live in the submodule on
  `feat/frontend-wiring` and this repository records the new submodule pointer on its own
  `feat/frontend-wiring`, branched from `fix/backend-modules`.
- L6 (evidence, checks):
  - `cd frontend && npx ng test --watch=false` -> 14 files / 33 tests passed, exit 0.
    Baseline before this feature: 4 files failed (login, signup, App, Sidebar), 15 tests passed.
  - `cd frontend && npx ng build` -> exit 0. Warnings only: the initial bundle exceeds the 500 kB
    budget (609.64 kB) and the `library.css` / `calendar.css` component budgets are exceeded.
  - `cd backend && npm test` -> 18 tests, 0 fail, exit 0 (includes the per-user isolation cases
    "exige que la carpeta pertenezca al usuario" and "guarda un borrador por usuario").
  - `cd backend && npm run build` -> exit 0.
- L7 (evidence, notepad test seam): jsdom does not implement `HTMLElement.innerText`, so the
  notepad reads the editor through one `plainText()` helper (`innerText`, falling back to
  `textContent`). Without it the page counted 0 characters in tests and the "guardar en
  biblioteca" button stayed disabled.
