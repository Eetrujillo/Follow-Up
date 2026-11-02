# backend-modules

Close the remaining findings of the security/code-quality audit on the Follow-Up
backend, and deliver the work as chained GitHub PRs.
Branch: `fix/backend-modules`, stacked on `feat/api-migration`.

## Specs

- **S1** — (M1) "Los servicios StatsService, NotepadService, DocumentsService y
  FoldersService mantienen las plantillas generadas automáticamente por NestJS
  (nest g resource). Retornan respuestas de texto fijo (ej. "This action returns all
  notepad") y no se conectan a la base de datos." Each module must persist and read real
  rows, scoped to the authenticated user.
- **S2** — (M4) "El backend no cuenta con el endpoint PATCH /calendar/:id para guardar
  las ediciones de eventos realizadas en el frontend. Adicionalmente, el método
  findAll(month, year) recibe los parámetros de mes y año pero los ignora en la consulta
  a la base de datos, retornando siempre todos los eventos." `PATCH /calendar/:id`
  already exists on this branch; the month/year filter is the open part.
- **S3** — (H4) "Al contener únicamente la regla node_modules, se subieron al repositorio
  79 archivos innecesarios, tales como la carpeta compilada dist/, archivos de log
  (build.log, setup-esm-fix.log), respaldos de esquemas Prisma
  (schema.prisma.actual.backup) y el archivo .env." The remaining tracked generated
  artifact, `backend/prisma/schema.prisma.actual.backup*`, must be untracked and ignored.
- **S4** — (H1) "El archivo backend/.env fue subido en el commit 635d788 y permanece en el
  repositorio. Expone el valor real de JWT_SECRET y la URL de conexión a la base de datos
  de Railway". On this branch `.env` is untracked from every live branch and `origin`,
  and `JWT_SECRET` is rotated; the remaining evidence is local backup/agent refs, which
  are documented, not deleted (no authorization to destroy that backup).
- **S5** — (delivery) "Subir los cambios a GitHub y abrir PRs" and "no solo necesito que
  arregles los errores dentro de la repo". Push the branches and open the stacked PRs.

Out of scope: wiring the frontend `library`, `notepad` and `statistics` pages to the new
endpoints; rotating Railway secrets; force-pushing a remote history rewrite.

## Tasks

| ID | Spec | Task | Route | Commit |
|----|------|------|-------|--------|
| T1 | S1,S2 | Write RED e2e tests for folders/documents/notepad/stats and the calendar month filter. | inline | `739ffbe` |
| T2 | S1 | Folders module against Prisma, scoped by `CurrentUser`. | inline | `739ffbe` |
| T3 | S1 | Documents module against Prisma, folder ownership checked. | inline | `739ffbe` |
| T4 | S1 | Notepad single-draft upsert per user. | inline | `739ffbe` |
| T5 | S1 | Stats streak persistence and visit update. | inline | `739ffbe` |
| T6 | S1 | Register the four modules in `AppModule`. | inline | `739ffbe` |
| T7 | S2 | Calendar `month`/`year` filter. | inline | `fe304aa` |
| T8 | S3 | Untrack schema backups and extend `.gitignore`. | inline | `a748f74` |
| T9 | S1-S5 | Verify: build, e2e green, two-user isolation, cleanup. | inline | `fe304aa` |
| T10 | S4 | Record H1 evidence (live refs/remote clean, rotated secret). | inline | |
| T11 | S5 | Commit slices, push branches, open PRs. | inline | |

## Log

- L1 (user, verbatim): "necesito que ingreses a proyectos y a folloup y arregla lo
  siguiente 1. Hallazgos de SeguridadH1. Archivo .env con el secreto JWT subido al
  repositorio   Qué pasa: El archivo backend/.env fue subido en el commit 635d788 y
  permanece en el repositorio. Expone el valor real de JWT_SECRET y la URL de conexión a
  la base de datos de Railway (servidor, puerto, usuario y esquema). La contraseña de la
  base de datos no quedó expuesta (aparece como <PROYECTO1_PASSWORD>).   Ubicación:
  Repositorio Eetrujillo/Follow-Up, en backend/.env (líneas 1-2).   Riesgo: Permite a
  cualquier atacante generar tokens de autenticación válidos para cualquier usuario sin
  conocer su contraseña y da los datos de conexión exactos de la base de datos.   Impacto
  en nota: Penalización de −0.4 en la sección de Seguridad. H2. Tareas y calendario
  siempre usan al primer usuario registrado   Qué pasa: Los servicios TasksService y
  CalendarService no identifican al usuario mediante el token JWT. Usan la función
  getDefaultUserId() para obtener al primer usuario creado en la base de datos y asignarle
  todas las tareas y eventos.   Ubicación: backend/src/tasks/tasks.service.ts (líneas
  12-18, 21, 38, 50, 74) y calendar.service.ts.   Riesgo: Todos los usuarios de la
  aplicación visualizan, crean y eliminan las tareas y eventos pertenecientes a la primera
  persona registrada.   Impacto en nota: Se incluye como recomendación; no descuenta nota
  al haberse enseñado en clase únicamente el login con JWT. H3. Las rutas de datos no
  piden token de autenticación   Qué pasa: Aunque JwtAuthGuard y JwtStrategy están
  definidos, solo se aplican en auth.controller.ts. Los controladores de los módulos
  tasks, calendar, documents, folders, notepad, stats y users carecen de guards de
  seguridad.   Ubicación: backend/src/tasks/tasks.controller.ts y
  backend/src/calendar/calendar.controller.ts (y resto de controladores de datos).
  Riesgo: Cualquier usuario no autenticado puede consultar, crear y eliminar registros
  libremente.   Impacto en nota: Se incluye como recomendación; no descuenta nota. H4. El
  archivo .gitignore solo ignora node_modules   Qué pasa: Al contener únicamente la regla
  node_modules, se subieron al repositorio 79 archivos innecesarios, tales como la carpeta
  compilada dist/, archivos de log (build.log, setup-esm-fix.log), respaldos de esquemas
  Prisma (schema.prisma.actual.backup) y el archivo .env.   Ubicación:
  backend/.gitignore (línea 1).   Riesgo: Cualquier archivo nuevo que contenga claves,
  logs de conexión o copias de base de datos se subirá automáticamente sin ser advertido.
  Impacto en nota: Penalización de −0.3 en la sección de Calidad del código.   2.
  Hallazgos en Módulos e Integración Frontend/BackendM1. Módulos Dashboard, Library y
  Notepad no están implementados   Qué pasa: Los servicios StatsService, NotepadService,
  DocumentsService y FoldersService mantienen las plantillas generadas automáticamente por
  NestJS (nest g resource). Retornan respuestas de texto fijo (ej. "This action returns
  all notepad") y no se conectan a la base de datos.   Ubicación:
  backend/src/notepad/notepad.service.ts (líneas 5-9) y equivalentes en stats, documents y
  folders.   Riesgo: Cuatro de los siete módulos responden con éxito (HTTP 200) pero con
  datos ficticios, sin almacenar ni recuperar información real.   Impacto en nota:
  Penalización de −0.2 en la sección de Calidad del código. M2. El frontend no utiliza los
  endpoints del backend   Qué pasa: Aunque en el frontend existen las clases
  AuthApiService, UsersApiService, TasksApiService y CalendarApiService, ningún componente
  las inyecta. El login y registro emplean UserService, guardando y validando los usuarios
  en el servicio externo JSONBin con contraseñas en texto plano.   Ubicación: Frontend en
  src/app/shared/services/user.service.ts (líneas 33-39).   Riesgo: Se descarta todo el
  desarrollo del backend (hashing, JWT, persistencia de tareas) y las contraseñas reales
  quedan almacenadas sin cifrar.   Impacto en nota: Es una observación del frontend, no
  descuenta nota en la evaluación del backend. M3. Claves secretas de JSONBin y Cohere
  escritas en el frontend   Qué pasa: El frontend incluye directamente en su código la
  Master Key de JSONBin (junto al ID del bin de usuarios) y la API Key de Cohere.
  Ubicación: Frontend en src/app/shared/services/jsonbin.service.ts (líneas 22-24) y
  src/app/shared/services/ai.service.ts (línea 8).   Riesgo: Cualquier usuario puede
  extraer la Master Key para leer, modificar o eliminar todos los correos y contraseñas
  almacenados, o consumir la cuota de la cuenta de Cohere.   Impacto en nota: Es una
  observación del frontend, no descuenta nota en el backend. M4. El módulo Calendar no
  permite editar ni filtrar por mes   Qué pasa: El backend no cuenta con el endpoint PATCH
  /calendar/:id para guardar las ediciones de eventos realizadas en el frontend.
  Adicionalmente, el método findAll(month, year) recibe los parámetros de mes y año pero
  los ignora en la consulta a la base de datos, retornando siempre todos los eventos.
  Ubicación: backend/src/calendar/calendar.controller.ts (líneas 5-23) y
  calendar.service.ts (líneas 57-66).   Riesgo: Imposibilidad de actualizar eventos y
  sobrecarga al traer siempre todo el historial de eventos en cada consulta.   Impacto en
  nota: Se deja como observación; no descuenta nota."
- L2 (user, verbatim): "no solo necesito que arrglges los errores dentro de la repo"
- L3 (decision): user picked "Subir los cambios a GitHub y abrir PRs" for the extra
  delivery work.
- L4 (finding): H2, H3, M2, M3 and `PATCH /calendar/:id` are already fixed on
  `feat/api-migration`; this feature only covers the open M1, the M4 filter, the H4
  artifact and delivery.
- L5 (finding): the four stub modules are not even registered in `AppModule`, so they
  currently answer `404` instead of the audited fake `200`.
- L6 (decision): M1 stays backend-only; the frontend `library`, `notepad` and `statistics`
  pages keep their localStorage behavior.

- L7 (evidence): `npm run build` exit 0; `npm test` 18/18 green after the split
  (`backend-modules.e2e.test.mjs` 11 checks, `calendar-filter.e2e.test.mjs` 7 checks);
  the suite proves 401 without token, two-user isolation, folder ownership, notepad
  per-user isolation, streak idempotency and the month/year filter; the throwaway users
  are deleted in `after` and a Prisma check reports 0 leftover `audit-*`/`filter-*` users.
- L8 (evidence, H1): `backend/.env` is absent from `main`, `chore/repo-hygiene`,
  `feat/api-migration`, `fix/backend-modules` and every `origin/*` branch; the leaked
  `JWT_SECRET` does not appear in the live history; the current local secret is a
  different, 66-char value. The old blob survives only in the local
  `refs/backup/pre-purge` and agent checkpoint refs, which are left untouched pending
  explicit authorization to destroy that backup.
- L9 (slice boundary): the review slice for this feature is `d6c9206..HEAD` (three
  commits). `origin/main..HEAD` is not the slice: it includes the pre-existing
  `feat/api-migration` work and the 35k generated-line deletions owned by
  `chore/repo-hygiene`.
