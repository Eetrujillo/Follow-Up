# Auditoría de la aplicación — Follow-Up

**Fecha:** 2026-11-15
**Alcance:** repositorio del proyecto únicamente (`Eetrujillo/Follow-Up` + submódulo `Eetrujillo/Follow_Up`).
**Fuera de alcance por pedido explícito:** VPS, nginx del host, certificados, fail2ban y todo lo que no vive en el repo.
**Commits auditados:** backend en `prod` = `a71aa9c`; SPA en `feat/api-migration` = `63e009c` (el que pinnea el gitlink).

Este documento **no modifica código**. Es un inventario de fallas con evidencia y dirección de arreglo.

## 0. Estado de los arreglos

Se actualiza a medida que cada hallazgo se interviene. Un hallazgo pasa a ✅ solo cuando hay un test que fallaba antes del cambio y pasa después.

| Hallazgo | Estado | Evidencia |
|---|---|---|
| C1 — sin autorización por usuario | ✅ Corregido | T2: e2e `auth-isolation` pasó de 5 fallas a 7 verdes (401 sin token, listados cruzados, PATCH y DELETE ajenos → 404) |
| C2 — JWT en localStorage + sink de HTML | ⚠️ Mitigado (queda la cookie HttpOnly) | T4: fuera el último `innerHTML` del SPA (`97b0b10`); CSP `script-src 'self'` verificada con `curl -I` sobre el nginx real |
| H1 — registro abierto sin límite | ✅ Corregido | T3: `POST /api/users` devolvía **201 Created** sin token; ahora 404. Login y registro throttleados (429 verificado) |
| H2 — PII enumerable por id | ✅ Corregido | T3: `GET /api/users/:id` eliminado; el perfil se lee en `GET /auth/me` con token |
| H4 — backend sin tests | ✅ Corregido | T1: arnés e2e con vitest + SWC y base descartable |
| H7 — `backend/dist/` versionado | ✅ Corregido | T3b (`0f4b9f2`): `backend/dist` ya no existe en el árbol; el contenedor compila en el build |
| M1 — fechas del calendario | ✅ Corregido (2026-11-16) | e2e `tasks-calendar-integrity`: `{month:2, day:31}` pasó de **201 guardado como 3 de marzo** a 400; la fecha se guarda en UTC (`…T00:00:00.000Z`, antes `…T05:00:00.000Z` con la zona del servidor). La corrida fija `TZ=America/Lima` para que la regresión vuelva a ser detectable en un host UTC |
| M2 — borrado asimétrico tarea/evento | ✅ Corregido (2026-11-16) | Borrar la tarea de un evento ya no deja el evento huérfano (`ON DELETE SET NULL`), y se quitó el `catch` que tragaba la falla del borrado inverso |
| M5 — sin `@@index([userId])` | ✅ Corregido (2026-11-16) | Migración `20261116034701_add_owner_indexes` sobre `Task`, `CalendarEvent`, `Document`, `Folder` |
| Nuevo — `completedAt` nunca escrito | ✅ Corregido (2026-11-16) | Se sella al completar, se limpia al reabrir, y un PATCH repetido no lo mueve |
| Nuevo — `origin` lo elegía el cliente | ✅ Corregido (2026-11-16) | `POST /api/tasks` ignora `origin`: sólo el servicio de calendario crea tareas `CALENDAR` |
| Nuevo — strings sin límite | ✅ Corregido (2026-11-16) | `description` 2000, `title` 200, `fullName` 120 y sin sólo espacios |
| Nuevo — `PATCH /api/calendar/:id` inexistente | ✅ Implementado (2026-11-16) | Editar un evento ya no da 404: renombrarlo renombra la tarea vinculada (`Evento: <title>`) y mover la fecha mueve también su `dueDate`, en una transacción. e2e `calendar-update` + `calendar-update-contract` (15 tests) |
| Nuevo — `npm start` arrancaba **sin validación** | ✅ Corregido (2026-11-16) | `start` era `tsx src/main.ts`, y tsx/esbuild no emite `emitDecoratorMetadata`: Nest no veía el tipo del body y **todos** los `ValidationPipe` quedaban apagados (registro con email inválido y nombre de espacios → **201**, con 9 warnings de metadata). Ahora `nest start` (tsc): mismo request → **400**, cero warnings |
| H3, H5, H6, M4, M6, M7, M8 y los L* | Pendiente | Ver secciones 3, 4 y 5 |

---

## 1. Resumen ejecutivo

| Severidad | Cantidad | Tema dominante |
|---|---|---|
| Crítica | 1 | Autorización inexistente |
| Alta | 7 | JWT en `localStorage`, registro y perfil abiertos, cero tests, módulos muertos, `dist` versionado |
| Media | 8 | Filtros ignorados, fechas en zona del servidor, errores silenciados, budgets de build |
| Baja | 8 | Ruido de desarrollo, mapeo de errores incompleto, deps dudosas |

El crítico es uno solo y es el que importaba: **no había autorización por usuario**. Lo que parecía una cadena de ataque (autorización ausente + XSS activo) resultó, al leer el código con cuidado, en un riesgo latente: el token está donde un XSS lo leería, pero hoy no hay una vía para inyectar ese script. Ver la corrección en C2.

---

## 2. Hallazgos críticos

### C1 — No existe autorización por usuario: cualquier anónimo opera sobre los datos del primer usuario

**Evidencia**
- `backend/src/tasks/tasks.service.ts:11-17` y `backend/src/calendar/calendar.service.ts:11-17`:
  ```ts
  private async getDefaultUserId() {
    const user = await this.prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
    ...
  }
  ```
- `backend/src/tasks/tasks.controller.ts:7` y `backend/src/calendar/calendar.controller.ts:7-9`: ningún `@UseGuards`.
- `backend/src/app.module.ts:8-13`: solo se montan `PrismaModule`, `AuthModule`, `TasksModule`, `CalendarModule`.
- Única ruta protegida de todo el backend: `auth.controller.ts:32` (`GET /auth/me`).

**Impacto.** El JWT no participa en ninguna decisión de negocio. `POST/GET/PATCH/DELETE /api/tasks` y `POST/GET/DELETE /api/calendar` funcionan sin token y siempre contra el usuario más antiguo de la tabla. Es decir: cualquiera con la URL lee, escribe y borra las tareas y el calendario del dueño de la cuenta. Verificado empíricamente contra el servidor: `GET /api/tasks` responde `404 "No hay usuarios registrados"` sin credenciales, lo que demuestra que la ruta se evalúa antes de cualquier autenticación.

**Dirección de arreglo.** Inyectar el usuario desde el request autenticado (`@Req()` con `JwtStrategy`, que ya devuelve el `PublicUser`) en cada servicio firmado con el `userId` del token, y poner `@UseGuards(JwtAuthGuard)` a nivel de controller. Borrar `getDefaultUserId()` de ambos servicios y del proyecto. Antes de escribir código, decidir el punto 1 de la sección 4.

### C2 — El JWT vive en `localStorage` (severidad alta, no crítica)

**Evidencia**
- `frontend/src/app/shared/services/token-storage.ts:8-10`: `localStorage.getItem/setItem('backend_access_token')`.
- `frontend/src/app/pages/notepad/notepad.ts:99` leía `innerHTML` para pasarlo a texto plano (sin riesgo: leer no ejecuta).

**Impacto.** El token está donde cualquier script ejecutado en la página puede leerlo, y `localStorage` no recibe la protección `HttpOnly`. Con el token se actúa como el usuario.

**Corrección de este informe.** La primera versión marcaba esto como crítico afirmando que había XSS disponible en el notepad por `temp.innerHTML = html` y `insertAdjacentHTML`. Al rastrear los llamadores, el único era `insertHtmlAtCursor('<br><br>')`: markup constante escrito en el componente. El pegando de portapapeles se intercepta y entra como nodo de texto. **No existía una vía para que contenido del usuario llegara al parser**, así que el hallazgo es un riesgo latente, no una vulnerabilidad activa: la severidad baja a alta.

**Dirección de arreglo (hecho y pendiente).** Hecho: el sink de HTML del notepad se reemplazó por inserción de nodos, así que ya no queda ningún `innerHTML` en el SPA; y `nginx.conf` ahora emite una CSP con `script-src 'self'`, que impide ejecutar un script inyectado. Pendiente y con decisión de producto: mover la sesión a cookie `HttpOnly` + `SameSite`, lo que obliga a tocar el backend (hoy devuelve `access_token` en el body y el SPA lo guarda).

---

## 3. Hallazgos altos

### H1 — Registro abierto y sin límite de intentos

`backend/src/users/users.controller.ts:9` exponía `POST /api/users` sin guarda, y `auth.controller.ts:17` exponía `POST /api/auth/register` sin límite: **dos caminos de registro** con formatos de respuesta distintos. No existe ningún throttle ni bloqueo por intentos en el backend.

**Corrección de este informe:** una versión anterior de este documento afirmaba que `env.sample` y `docker-compose.yml` describían un lockout de login y un throttle de emails que no existían en el código. Esa afirmación era **falsa**: correspondía al compose de otro proyecto del mismo servidor. En este repo no hay ninguna mención a lockout, throttle ni SMTP.
**Arreglo (hecho):** un solo endpoint de registro (`POST /auth/register`), `@nestjs/throttler` en login y registro con límites validados al arrancar, y `UsersController` eliminado.

### H2 — PII enumerable por id

`users.controller.ts:14` (`GET /api/users/:id`) devolvía `fullName`, `email` y `createdAt` sin autenticación. El UUID mitiga la adivinanza, pero el endpoint no debía ser anónimo.
**Arreglo (hecho):** `GET /api/auth/me` es la única lectura de perfil y exige token; el `UsersController` completo se eliminó.

### H3 — Sin defensas transversales en el arranque

`backend/src/main.ts:1-17` no registra `helmet`, no hay rate limiting global, no hay filtro de excepciones y no hay logger estructurado. `enableCors` acepta un único origen leído de `FRONTEND_URL`, con fallback a `http://localhost:4200`.
**Arreglo:** `helmet()`, `ThrottlerModule` global, filtro que normalice la forma del error y un logger. Validar `FRONTEND_URL` en el arranque, igual que ya se hace con `JWT_SECRET` en `auth.config.ts`.

### H4 — El backend no tiene ni un test

`find backend -name "*.spec.ts"` no devuelve nada. Hay 1013 líneas de backend sin red de seguridad. El SPA tiene 14 specs (mayormente de componentes y utilidades), ninguno de integración contra el backend real.
**Arreglo:** antes de tocar autenticación, un e2e con `supertest` sobre una base efímera que cubra: registro, login, 401 sin token, 403/404 al intentar el recurso de otro usuario, y borrado de tarea al borrar el evento de calendario. Sin eso, el arreglo de C1 no se puede verificar.

### H5 — Cuatro módulos completos que nunca se ejecutan

`backend/src/documents/`, `folders/`, `notepad/`, `stats/` existen **y no están importados** en `app.module.ts`. Se compilan, se mantienen y no se sirven. Peor: dan la impresión de que la API tiene notas, documentos y estadísticas, cuando esas features solo existen en el SPA.
**Arreglo:** decidir por módulo: `import` real con guardas y tests, o borrado. Mantenerlos "por si acaso" es la deuda más caras de este repo porque sugiere capacidades que no existen.

### H6 — `calendar` acepta filtros y los ignora
`calendar.controller.ts:17-19` recibe `month` y `year`, y `calendar.service.ts:57-70` (`findAll(month?, year?)`) **nunca los usa**: devuelve todos los eventos del usuario. El SPA cree estar filtrando por mes.
**Arreglo:** filtrar por rango (`eventDate` entre el inicio y el fin del mes) o quitar los parámetros. En el estado actual es una mentira de la API, y silenciosa.

### H7 — El resultado de compilación está versionado

`backend/dist/` está en el repositorio (`git ls-files backend/dist` lista los `.js` emitidos). Cualquier `npm run build` ensucia el árbol de trabajo con artefactos derivados, y un `dist` viejo puede terminar servido si alguien ejecuta `node dist/src/main.js` sin recompilar. El `.gitignore` lo ignora para archivos nuevos, pero los ya rastreados siguen versionados.
**Arreglo:** `git rm -r --cached backend/dist` y commitear la eliminación; el contenedor ya compila desde el código fuente.

### H8 — La suite de tests del SPA está rota — ✅ CORREGIDO (2026-11-15)

De los 14 archivos de test del SPA, **12 fallaban** en el código actual (16 de 19 tests). La causa raíz era doble y ninguna era `AuthService`: (1) Node 26 expone `localStorage` como global experimental que es `undefined` sin `--localstorage-file`, y el entorno jsdom de vitest no puede pisar ese key ya definido; (2) los specs de App, Sidebar, Login y Signup construían componentes standalone sin router, con `NG0201` en `RouterLink`/`ActivatedRoute`.

**Arreglo aplicado (frontend `ef378ae` + `6703aed`):** el script `test` corre con `NODE_OPTIONS=--localstorage-file` apuntando a un archivo **por corrida** (`${TMPDIR:-/tmp}/ng-test-localstorage-$$`) — cada corrida arranca sin estado arrastrado, cosa que importa porque `TokenStorage` escribe en `localStorage` y ningún spec lo limpia globalmente; cada spec sin router provee `provideRouter([])`; la aserción boilerplate del App spec (buscaba un `h1` que nunca existió) se reemplazó por la conducta real del layout por defecto. Suite: **14 archivos / 19 tests en verde**, verificado en corridas consecutivas. La recomendación de exigir la suite verde antes de tocar el SPA queda como proceso.

---

## 4. Hallazgos medios


| ID | Evidencia | Problema | Dirección |
|---|---|---|---|
| M1 | `calendar.service.ts:26` | `new Date(year, month-1, day)` construye la fecha en la zona horaria del **servidor**, no del usuario: un evento del día 15 puede verse el 14 en otro huso. (El DTO sí acota `month` 1-12 y `day` 1-31, así que el desborde silencioso no es alcanzable por HTTP) | Construir la fecha en UTC (`Date.UTC`) o guardar fecha + zona explícita |
| M2 | `calendar.service.ts:80-83` | Al borrar un evento, el borrado de la tarea encadenada va con `.catch(() => null)`: cualquier falla se traga y queda una tarea huérfana | No silenciar: o transacción completa o error explícito |
| M4 | `tasks.controller.ts:19,24`, `calendar.controller.ts:20` | Sin `ParseUUIDPipe`: un id inválido llega a Prisma y devuelve 500 en vez de 400 | `ParseUUIDPipe` como ya se usa en `users.controller.ts:15` |
| M5 | `prisma/schema.prisma` | No hay `@@index([userId])` en `Task`, `CalendarEvent`, `Document`, `Folder`; todos los accesos son por `userId` | Agregar índices antes de que el volumen importe (barato ahora, molesto después) |
| M6 | `auth.service.ts:31-46` | `login` devuelve `access_token` en el body y no hay refresh: sesión muerta a las 24 h sin aviso, el usuario pierde trabajo en curso | Definir estrategia (refresh + cookie, o aviso de expiración en el SPA) |
| M7 | `frontend/angular.json:33-46` | El budget inicial es 500 kB y el build real emite **606 kB**; dos CSS de componentes exceden el suyo. Son warnings, así que el build pasa y la deuda crece hasta el error de 1 MB | Subir el budget a un número intencional o bajar el bundle (lazy loading de rutas pesadas) |
| M8 | `frontend/src/app/shared/services/ai.service.ts` | La generación de tareas con IA está deshabilitada a propósito (devuelve error). Si la UI ofrece el botón, el usuario ve un fallo sin explicación | Ocultar la acción en la UI o implementar `POST /api/ai/tasks` en el backend |

**Corrección de este informe (2026-11-16).** La frase «el desborde silencioso no es alcanzable por HTTP» era **falsa**: `@Max(31)`/`@Max(12)` validan cada campo por separado, no la combinación, así que `{month:2, day:31}` se aceptaba con 201 y se guardaba como 3 de marzo (y `year` sin `@Max` producía `Invalid Date` → 500). Corregido con el validador `IsRealCalendarDate` (`backend/src/calendar/dto/is-real-calendar-date.ts`), que compara el día/mes/año contra la fecha construida, y con `Date.UTC` en el servicio. Evidencia: e2e `test/tasks-calendar-integrity.e2e-spec.ts`.

Dos precisiones más sobre este cuadro: **M3 quedó obsoleto** (C1 eliminó `getDefaultUserId()`), y **M4 estaba mal diagnosticado**: no hay 500, porque `id` es `TEXT` sin `@db.Uuid` (`migration.sql:21`) y un id inválido simplemente no encuentra fila → 404. Sigue faltando el `ParseUUIDPipe`, pero por claridad de contrato, no por un 500 real. **M5** pasó a ✅ con la migración `20261116034701_add_owner_indexes`.

---

## 5. Hallazgos bajos

| ID | Evidencia | Problema |
|---|---|---|
| L1 | `frontend/src/app/pages/notepad/notepad.ts:233,280` | `console.log`/`console.error` de depuración con la palabra "Cohere" en código de producción: ruido y pistas históricas |
| L2 | `backend/src/prisma/prisma-error.ts:14-22` | Solo mapea `P2002` y `P2025`; `P2003` (FK) y `P2023` (id malformado) caen en 500 genérico |
| L3 | `backend/src/prisma/prisma.service.ts:10-18` | El `Pool` se construye en el constructor con `process.env.DATABASE_URL` sin validar: si falta, el error es críptico en vez de "falta DATABASE_URL" |
| L4 | `backend/package.json:33-34` | `prisma` (CLI completo) viaja como dependencia de producción porque el contenedor lo necesita para `migrate deploy`; es correcto, pero conviene documentarlo para que nadie lo "limpie" |
| L5 | `backend/package.json:5` | `start` usa `tsx` sobre TypeScript en caliente; sirve para desarrollo, no debe usarse como entrypoint de producción |
| L6 | `frontend/package.json` (devDependencies) | Conviven `@types/jasmine`, `vitest` y `jsdom`; el builder de test es `@angular/build:unit-test`. Hay tipados de un runner que ya no se usa |
| L7 | `frontend/src/app/shared/interceptors/backend-auth.interceptor.ts:13-16` | Si no hay token, la request sale igual: el error final será 401/404 del backend en vez de un corte temprano con mensaje claro |
| L8 | `backend/src/users/users.service.ts:24-26` | Check-then-insert apoyado en `P2002` (correcto), pero ejecuta una query extra por registro; aceptable, solo que quede escrito |

**Lo que está bien y no hay que romper:** `auth/password.ts` usa `scrypt` con `timingSafeEqual` y un `dummyHash` para no filtrar por tiempo si el email no existe; `jwt.strategy.ts` valida que el `sub` sea UUID y que el usuario exista; `auth.config.ts` falla al arrancar si `JWT_SECRET` o `JWT_EXPIRES_IN` están mal; el interceptor solo adjunta el token a las URLs del backend; `TokenStorage` centraliza el acceso. Esa base es sólida — el problema no es cómo se firma el token, es que casi nadie lo mira.

---

## 6. Cosas que hay que decidir antes de arreglar

No son fallas, son decisiones que cambian el tamaño del arreglo. Sin resolverlas, cualquier parche de C1 es a ciegas.

1. **¿La app es de un usuario o multiusuario?** ~~Sin decidir~~ **Resuelto: multiusuario.** C1 se cerró con guardas por controller y `userId` del token en cada servicio, y `test/auth-isolation.e2e-spec.ts` lo pinea. Queda la deuda de la cookie `HttpOnly` (C2) y la revocación de sesión (M6).
2. **¿El registro queda abierto?** Hoy cualquiera crea cuentas por dos endpoints distintos. Con el modelo de un dueño, el primer registro debería ser un comando de operación (seed), no un endpoint público.
3. **¿Dónde vive la sesión?** `localStorage` es simple y cómodo de desarrollar, e incompatible con tener XSS. Cambiar a cookie `HttpOnly` toca backend, interceptor y CORS. Es una decisión de producto, no un detalle.
4. **¿Qué pasa con `documents`, `folders`, `notepad`, `stats`?** Cuatro módulos muertos. O se montan con guardas y tests, o se borran. Dejarlos es comprometerse a mantener código que nadie ejecuta.
5. **¿Cómo se verifica un arreglo?** Con cero tests de backend, el arreglo de autorización no se puede probar. El orden sano es: e2e primero (rojo), después el arreglo.
6. **¿Hay datos que preservar?** La migración `20261111173333_init` se regeneró desde cero y la base en producción está vacía. Si alguien ya cargó datos, cualquier cambio de esquema necesita migración real, no otra regeneración.
7. **Contrato de despliegue que no se debe romper:** todo vive bajo `/api`, y el `nginx` del contenedor lo proxya sin quitar el prefijo. Cambiar el prefijo rompe el SPA en producción, no solo los tests.

---

## 7. Cumplimiento del contrato `S#` — verificación de specs

| Promesa en documentación | Estado real | Hallazgo |
|---|---|---|
| `env.sample`: lockout de login 5 intentos / 15 min | **Corregido en este documento**: `env.sample` documenta hoy `AUTH_THROTTLE_LIMIT=5` / `AUTH_THROTTLE_TTL_SECONDS=60`, implementado en `auth.throttle.ts` | H1 |
| `env.sample` / compose: throttle de reenvío de email 3 / 60 min | No implementado; no hay SMTP ni verificación | H1 |
| `DEPLOY.md`: un solo usuario por instalación | Coherente con `getDefaultUserId()`, pero no está protegido | C1 |
| `DEPLOY.md`: todo bajo `/api` | Correcto y verificado en producción | — |
| `AiService`: IA deshabilitada hasta tener endpoint | Correcto en el servicio; la UI puede seguir ofreciéndola | M8 |

---

## 8. Qué no se revisó

- Infraestructura y sistema operativo del servidor (fuera de alcance por pedido).
- Rendimiento bajo carga real, y consultas lentas con volumen: con 1013 líneas y sin datos, no hay nada que medir todavía.
- Cobertura real de los 14 specs del SPA: se listaron, no se ejecutaron ni se evaluó su calidad aserción por aserción.
- Dependencias por CVE: no se corrió `npm audit`. Recomendable antes de producción con usuarios reales.

---

**Orden de arreglo recomendado:** decidir el punto 1 de la sección 6 → escribir los e2e que fallan (H4) → cerrar C1 → cerrar C2 → H1/H2 → H5 (borrar o montar) → el resto.

---

## 9. Intervención 2026-11-16 — multiusuario verificado y arreglos de integridad

### 9.1 ¿La app sirve para varios usuarios? Sí, del lado del backend

Verificado leyendo el código y corriendo la suite (`6 archivos / 24 tests`):

- **Guardas por controller**, no por ruta: `tasks.controller.ts:8` y `calendar.controller.ts:7` tienen `@UseGuards(JwtAuthGuard)` a nivel de clase, y no existe ningún `@Public` ni `SetMetadata` que permita saltearlas.
- **El dueño sale del token, nunca del body**: `CurrentUser` → `user.id` → primer argumento de cada método del servicio. `getDefaultUserId()` ya no existe en el repo.
- **Lectura y escritura de filas ajenas**: `findFirst({ where: { id, userId } })` antes de tocar nada, y ajeno = inexistente = 404 (`tasks.service.ts:83`, `calendar.service.ts:95`). Un 403 distinguiría ids reales.
- **Escrituras**: el `where` de `update`/`delete` sigue siendo `{ id }` pero sólo después de esa verificación, y `userId`/`id`/`createdAt` nunca se toman del DTO (`ValidationPipe` con `whitelist` + mapeo campo por campo).
- **Sin superficie compartida**: `documents`, `folders`, `notepad` y `stats` no están importados en `app.module.ts`, así que no hay endpoint que lea datos de otro.
- **Índices**: cada listado filtra por `userId`; sin índice era seq scan (M5, corregido).

Residuos del lado del SPA cuando se cambia de cuenta **en el mismo navegador sin recargar** (corregidos acá):

- `LibraryService` cacheaba en memoria las carpetas del usuario anterior; `login.ts` no llamaba a `reloadForUser()`. Ahora sí, con test en `library.spec.ts`.
- `TimerService` guardaba el cronómetro en la clave global `dashboard_timer`, compartida entre cuentas. Ahora la clave incluye el id del usuario (`timer.service.spec.ts`).

Sigue pendiente de decisión: JWT en `localStorage` (C2) y ausencia de revocación de sesión (M6).

### 9.2 Arreglos aplicados en esta intervención

| Archivo | Cambio |
|---|---|
| `calendar/dto/is-real-calendar-date.ts` (nuevo) | Valida la combinación día/mes/año: 31 de febrero deja de guardarse como 3 de marzo |
| `calendar/dto/create-calendar-event.dto.ts` | `@IsRealCalendarDate()` en `day`, `@Max(9999)` en `year`, `@MaxLength(200)` en `title` |
| `calendar/calendar.service.ts` | `Date.UTC` en vez de hora local del servidor; fuera el `.catch(() => null)` que se tragaba la falla del borrado |
| `tasks/tasks.service.ts` | Borra el evento vinculado en la misma transacción; sella y limpia `completedAt`; `origin` lo decide el servidor |
| `tasks/dto/create-task.dto.ts` | Fuera `origin`; `description` acotada a 2000 |
| `auth/dto/register.dto.ts`, `users/dto/create-user.dto.ts` | `fullName` sin sólo espacios y acotado a 120; `email` a 254 |
| `prisma/schema.prisma` + migración `20261116034701_add_owner_indexes` | `@@index([userId])` en `Task`, `CalendarEvent`, `Document`, `Folder` |
| `frontend`: `tasks-api.service.ts`, `task.ts`, `dashboard.ts` | Dejan de mandar `origin`; el `source` de la tarea sale del servidor |
| `test/tasks-calendar-integrity.e2e-spec.ts` (nuevo) | 8 tests que fallaban antes del cambio |
| `calendar/dto/update-calendar-event.dto.ts` (nuevo) | Fecha como unidad: o vienen `day`+`month`+`year` o ninguno; media fecha es 400. `null` explícito también es 400 (`@ValidateIf(v !== undefined)` en cada campo, no `@IsOptional`, que dejaba pasar `{"title": null}` hasta la base y devolvía 500); el servicio además sólo construye la fecha si los tres son números, porque `Date.UTC(null, …)` da 1899-11-30 |
| `calendar/calendar.service.ts` + controller | `PATCH /api/calendar/:id`: título y color del evento, y la tarea vinculada se renombra y se mueve con él en la misma transacción |
| `test/calendar-update.e2e-spec.ts` (nuevo) | 7 tests: renombrar, recolorear, mover la fecha, fecha incompleta, fecha inexistente, ajeno → 404, sin token → 401 |
| `test/calendar-update-contract.e2e-spec.ts` (nuevo) | 8 tests de borde: fecha toda `null` no corrompe las dos filas, `null` en título/color → 400 y no 500, mensajes exactos, fecha parcial (`{month, year}` sin `day`) no es no-op, evento sin tarea vinculada, rollback con trigger forzado, vínculo manipulado a tarea ajena, color-only leído de la base |

### 9.3 Encontrado y no tocado (necesita decisión o es alcance aparte)

- ~~**`PATCH /api/calendar/:id` no existe.**~~ **Resuelto (2026-11-16)** con la regla que faltaba decidir: el evento y su tarea son un recordatorio en dos filas, así que renombrar el evento reescribe `Task.description` (`Evento: <title>`) y mover la fecha actualiza `eventDate` y `Task.dueDate` en la misma transacción. Media fecha (`{day}` sin mes y año) es 400: adivinarla sería peor que rechazarla. Los eventos viejos cuyo `linkedTaskId` quedó en `NULL` se editan igual, sin tocar ninguna tarea.
- **`forbidNonWhitelisted`**: no se activó. Hoy un campo desconocido se descarta en silencio; activarlo convierte eso en 400, que es un cambio de contrato para cualquier cliente externo.
- **Throttle sólo en `/auth`**: `tasks` y `calendar` no tienen límite, y el storage es en memoria (por proceso, no por despliegue).
- **`bcrypt` instalado y sin usar** (`auth/password.ts` usa `scrypt` de `node:crypto`).
- H3 (helmet/logger/validar `FRONTEND_URL`), H5 (cuatro módulos muertos), H6 (filtros `month`/`year` ignorados), M6, M7, M8.
