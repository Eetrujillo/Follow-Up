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
| C2 — JWT en localStorage + XSS | ⏳ En curso | T4 |
| H1 — registro abierto sin límite | ⏳ En curso | T3 |
| H2 — PII enumerable por id | ⏳ En curso | T3 |
| H4 — backend sin tests | ✅ Corregido | T1: arnés e2e con vitest + SWC y base descartable |
| M1 — fechas del calendario | ⚠️ Parcial: el DTO **sí** valida `@Min`/`@Max`; solo queda la zona horaria | Corregido en el texto de la sección 4 |
| resto | Pendiente | — |

---

## 1. Resumen ejecutivo

| Severidad | Cantidad | Tema dominante |
|---|---|---|
| Crítica | 2 | Autorización inexistente; JWT en `localStorage` con XSS disponible |
| Alta | 6 | Registro abierto, sin rate limit, cero tests de backend, PII enumerable |
| Media | 8 | Módulos muertos, filtros ignorados, fechas sin validar, errores silenciados |
| Baja | 8 | Ruido de desarrollo, mapeo de errores incompleto, deps dudosas |

Los dos críticos se combinan en la misma cadena de ataque: **no hay autorización por usuario, y el token que sí existe se guarda donde un XSS lo puede leer.** Hoy la base está vacía, así que no hay dato real que perder; eso es suerte, no diseño.

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

### C2 — El JWT vive en `localStorage` y la app tiene vectores de XSS

**Evidencia**
- `frontend/src/app/shared/services/token-storage.ts:8-10`: `localStorage.getItem/setItem('backend_access_token')`.
- `frontend/src/app/pages/notepad/notepad.ts:99`: `const rawHtml = this.editorRef.nativeElement.innerHTML;`
- `frontend/src/app/pages/notepad/notepad.ts:162`: `temp.innerHTML = html;`

**Impacto.** Cualquier script inyectado lee el token y lo exfiltra; con ese token se toman las acciones del usuario. La nota del notepad se procesa como HTML crudo, y una nota con contenido malicioso (pegado desde afuera) es el vector natural. `localStorage` no está protegido por `HttpOnly`, así que no hay defensa en profundidad: XSS equivale a robo de sesión.

**Dirección de arreglo.** A corto plazo, sanear con `DomSanitizer` toda manipulación de HTML del notepad y evitar `innerHTML` sobre contenido que viene de datos. A mediano plazo, mover la sesión a cookie `HttpOnly` + `SameSite`, que obliga a tocar el backend (hoy devuelve `access_token` en el body). Lo que **no** sirve es seguir en `localStorage` y confiar en que no habrá XSS.

---

## 3. Hallazgos altos

### H1 — Registro público abierto y sin límite de intentos

`backend/src/users/users.controller.ts:9` expone `POST /api/users` sin guarda, y `auth.controller.ts:17` expone `POST /api/auth/register` sin límite. Además hay **dos caminos de registro** con formatos de respuesta distintos. No existe ningún throttle ni bloqueo por intentos, aunque `env.sample` y los comentarios de `docker-compose.yml` describen "lockout de login 5/15min" y "throttle de reenvío de email 3/60min": **esa configuración no tiene código detrás**. `auth.service.ts` no implementa ni el bloqueo ni el envío de emails de verificación.
**Arreglo:** un solo endpoint de registro, rate limit (`@nestjs/throttler`) en login y registro, y borrar del `env.sample` toda variable que no exista en el código.

### H2 — PII enumerable por id

`users.controller.ts:14` (`GET /api/users/:id`) devuelve `fullName`, `email` y `createdAt` sin autenticación. El UUID mitiga la adivinanza, pero el endpoint no debería ser anónimo.
**Arreglo:** mover la lectura de perfil a `GET /api/auth/me` (ya existe y está protegido) y eliminar el `GET` público de `users`.

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

---

## 4. Hallazgos medios

| ID | Evidencia | Problema | Dirección |
|---|---|---|---|
| M1 | `calendar.service.ts:26` | `new Date(year, month-1, day)` construye la fecha en la zona horaria del **servidor**, no del usuario: un evento del día 15 puede verse el 14 en otro huso. (El DTO sí acota `month` 1-12 y `day` 1-31, así que el desborde silencioso no es alcanzable por HTTP) | Construir la fecha en UTC (`Date.UTC`) o guardar fecha + zona explícita |
| M2 | `calendar.service.ts:80-83` | Al borrar un evento, el borrado de la tarea encadenada va con `.catch(() => null)`: cualquier falla se traga y queda una tarea huérfana | No silenciar: o transacción completa o error explícito |
| M3 | `tasks.service.ts:11-17`, `calendar.service.ts:11-17` | `getDefaultUserId()` duplicado literal en dos servicios | Extraer a un servicio o eliminarlo con C1 |
| M4 | `tasks.controller.ts:19,24`, `calendar.controller.ts:20` | Sin `ParseUUIDPipe`: un id inválido llega a Prisma y devuelve 500 en vez de 400 | `ParseUUIDPipe` como ya se usa en `users.controller.ts:15` |
| M5 | `prisma/schema.prisma` | No hay `@@index([userId])` en `Task`, `CalendarEvent`, `Document`, `Folder`; todos los accesos son por `userId` | Agregar índices antes de que el volumen importe (barato ahora, molesto después) |
| M6 | `auth.service.ts:31-46` | `login` devuelve `access_token` en el body y no hay refresh: sesión muerta a las 24 h sin aviso, el usuario pierde trabajo en curso | Definir estrategia (refresh + cookie, o aviso de expiración en el SPA) |
| M7 | `frontend/angular.json:33-46` | El budget inicial es 500 kB y el build real emite **606 kB**; dos CSS de componentes exceden el suyo. Son warnings, así que el build pasa y la deuda crece hasta el error de 1 MB | Subir el budget a un número intencional o bajar el bundle (lazy loading de rutas pesadas) |
| M8 | `frontend/src/app/shared/services/ai.service.ts` | La generación de tareas con IA está deshabilitada a propósito (devuelve error). Si la UI ofrece el botón, el usuario ve un fallo sin explicación | Ocultar la acción en la UI o implementar `POST /api/ai/tasks` en el backend |

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

1. **¿La app es de un usuario o multiusuario?** `getDefaultUserId()` y la ausencia de `userId` en el token indican que el diseño real es de un solo dueño. Si es así, el arreglo correcto no es "multiusuario" sino: un único usuario propietario, registro público cerrado, y un guard que exija que el token sea del dueño. Si es multiusuario, cada servicio necesita el `userId` del token y hay que migrar datos existentes.
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
| `env.sample`: lockout de login 5 intentos / 15 min | No implementado | H1 |
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
