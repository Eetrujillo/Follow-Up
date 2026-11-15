# auth-multiuser

Feature: multi-user authorization for Follow-Up. The audit (`docs/auditoria-app.md`) found that every business endpoint resolved a "default user" instead of the authenticated one.

**Estado: implementado, probado y desplegado. Review nativo (RDD): T2, A deploy+docs, B credenciales y C untrack de dist — todos aprobados y acknowledgeados.**

## Specs

**S1.** "si la app es multiusuario asi que ten en cuenta eso" — the application is multi-user. Every business endpoint must act on the user identified by the verified JWT, never on a user picked from the database. A user must not be able to read, modify or delete another user's rows, even knowing their ids.

**S2.** "en el md vas marcando en cual estas solucionando" — `docs/auditoria-app.md` carries the live status of each finding being fixed.

**S3.** "inica trabaja en local relaizas pruebas y despliegas" — work locally, prove it with tests, then deploy. No finding is marked fixed without a test that fails before the change and passes after it.

## Tasks

| ID | Task | Specs | Estado | Commit |
|---|---|---|---|---|
| T1 | Arnés de tests del backend (runner + Postgres descartable) | S1, S3 | ✅ | `d2411f0` |
| T2 | Aislamiento multiusuario en tasks y calendar (C1) | S1, S3 | ✅ | `a6a3086` |
| T3 | Registro y perfil cerrados + rate limit (H1, H2) | S1, S3 | ✅ | `41b3fcc` |
| T3b | `dist` fuera del control de versiones (H7) | S3 | ✅ | `0f4b9f2` |
| T4 | Notepad sin HTML crudo + CSP (C2 mitigado) | S3 | ✅ | `97b0b10`, `1de5214` (submódulo) |
| T5 | Informe con estado real | S2 | ✅ | incluido en cada commit |
| T6 | Deploy y verificación en el VPS | S3 | ✅ | `prod = 3f6cf1e` |
| T7 | Review nativo del candidato (RDD) | — | ✅ aprobado | linaje `review-da56a9b1a00f716d` |

## Estado verificado del despliegue (2026-11-15)

- Run `43676083408` en GitHub Actions: **success**. `prod = 3f6cf1e`.
- VPS (identificadores y ruta del clon guardados fuera del repo — el repo es público; ver DEPLOY.md y la memoria local para el acceso), rama `prod`, submódulo `1de5214`.
- `followup-frontend` y `followup-backend` recreados; `followup-postgres` **sin reiniciar** (los datos sobreviven al deploy de código).
- Evidencia contra el servidor: `GET /api/tasks` sin token → **401** (antes devolvía los datos del dueño), `POST /api/users` → **404** (antes **201**, creaba cuentas anónimas), `Content-Security-Policy` presente, `https://follow-up.eetrujillo.dev/` → 200.
- Tests: `cd backend && npm run test:e2e` → **11 tests verdes en 4 archivos**. El comando levanta un `postgres:16-alpine` desechable en `127.0.0.1:55432` y aplica las migraciones reales.

## Cómo retomar

```bash
cd /home/trujillo/Proyectos/Follow-Up
git branch --show-current      # feat/auth-multiuser en 3f6cf1e
cd backend && npm run test:e2e # 11 verdes; requiere docker
```

**Ramas:** `feat/auth-multiuser` = `prod` = `3f6cf1e`. Submódulo `frontend` en `feat/api-migration` = `1de5214`.

**Decisiones técnicas que no hay que revertir:**

- **Vitest, no jest**, porque NestJS 12 publica paquetes ESM-only (`@nestjs/testing` es `"type": "module"`); jest 29 no puede importarlo y jest 30 rompe el transform de ts-jest en Node 26. `vitest.config.ts` usa `unplugin-swc` por `emitDecoratorMetadata`, que esbuild no implementa.
- **`app.setup.ts`** centraliza prefijo `/api`, pipes y CORS, para que el e2e levante la misma app que producción.
- **`expires` en vez de `add_header`** en los `location` de nginx: un `location` que declara `add_header` deja de heredar los del `server`, y así se perdía la CSP justo en `index.html`.
- **Throttler por ruta**, no global: `/auth/me` es autenticado y no debe compartir el presupuesto anónimo. Límites validados al arrancar (`AUTH_THROTTLE_LIMIT`, `AUTH_THROTTLE_TTL_SECONDS`); en tests suben a 50.
- **Aislamiento de tests:** contenedor propio en 55432, nunca la base de desarrollo ni la de producción.

## Resultado del review nativo (2026-11-15)

Linaje `review-da56a9b1a00f716d`, candidato `a6a3086` (7 archivos, 373 líneas, tier high), lentes `review-risk` + `review-reliability`, dos corridas de revisor vía relay del host (`nan/glm5.3-flash`). Resultado: **approved**, acknowledge ejecutado, autoridad quemada. Sin correcciones ni hallazgos bloqueantes.

Hallazgos informativos (no bloquean, trabajo aparte):

- **R1-001** (risk, WARNING) — `backend/test/auth-isolation.e2e-spec.ts:45-46`: la suite e2e borra todas las filas de usuario de la base que apunte `DATABASE_URL`, sin confirmación. Si alguien la corre contra una base compartida o de staging destruye datos. Sugerencia: un guard de entorno que aborte salvo URL de test explícita.
- **R1-002** (risk, WARNING) — `backend/src/calendar/calendar.service.ts:41`: el controlador sigue aceptando `month`/`year` y el servicio los descarta (`_month`/`_year`), así que el filtro se ignora silenciosamente. Preexistente en la base, no regresión de este candidato.
- **R3-cal-params-1** (reliability, SUGGESTION) — `calendar.service.ts:44`: mismo punto; o filtrar de verdad o sacar los parámetros del contrato.
- **R3-doc-count-1** (reliability, SUGGESTION) — `docs/auditoria-app.md:16`: la tabla de estado dice que la suite de aislamiento pasó "de 5 fallas a 7 verdes", pero la suite del candidato define 5 tests. El conteo del documento no es reproducible desde los artefactos.

Los dos bloqueos previos quedaron resueltos: el binario `gentle-ai` ya estaba instalado en el paquete (`.gentle-ai/v4.5.0/`) y solo hacía falta `gentle-ai sync` (`managed_assets_outdated`); el routing de modelos se materializó desde `profiles.json` → `~/.gentle-shell/gentle-ai/models.json` (la clave `review-risk` ya estaba definida en el perfil `current`, pero el store global que la instalación en uso realmente lee no existía).

## Resultado del review nativo (2026-11-15, cadena completa)

La rama completa excede el presupuesto de contexto del revisor (`lens_context_budget_exceeded`, terminal), así que se revisó como candidatos encadenados. Todos **approved sin corrección obligatoria** (los hallazgos informativos no abrieron corrección y no reabren el review), acknowledge ejecutado y autoridad quemada; su disposición queda registrada debajo:

| Candidato | Alcance | Linaje | Hallazgos informativos |
|---|---|---|---|
| T2 `a6a3086` | Aislamiento multiusuario | `review-da56a9b1a00f716d` | 4 (ver abajo) |
| A deploy+docs | `0f4b9f2..HEAD` (compose, workflow, auditoría, docs) | `review-8e332370d2c8e9d2` | 3 — aplicados en `391b69b` |
| B credenciales | `41b3fcc` (registro cerrado + throttle, 214 líneas) | `review-b2f93ade032fd7ca` | 5 (2 accionables) |
| C1 untrack generated | `dist/generated` (13 archivos, −415) | `review-2ee8d108ea76f831` | 1 — verificado sin importers |
| C2 untrack src | `dist/src` (62 archivos, −1948) | `review-0a278b2ea4316aa0` | 0 |
| D docs posterior | `7d17cba..ea7914f` (solo `odd/tasks/auth-multiuser.md`) | `review-13c85558d4eeaec9` | 2 — aplicados (ver L9/L10) |

**Del candidato A** (aplicados): divulgar la IP/SSH del VPS en el doc committeado (corregido), contradicción L7/L8 sin marcador de supersedencia (corregido), estado de review que sobrepasaba su cobertura (corregido con L9).

**Del candidato B** (2 accionables, resueltos):
- **R1-proxy-bucket / R3-throttle-ip-key** → **H9, corregido**: el `ThrottlerGuard` presupuesta por `req.ip`; detrás de nginx sin `trust proxy` todos los clientes compartían un único presupuesto. Fix: `trustProxyHops()` en `app.setup.ts` (`TRUST_PROXY_HOPS`, validado al arranque, default 1 = el nginx del host; 0 desactiva) y test e2e RED→GREEN que prueba presupuesto por cliente vía `X-Forwarded-For`.
- **R3-e2e-shared-db** → **H10, no era un defecto**: `vitest.config.ts` ya corría con `fileParallelism: false` desde `d2411f0` (T1); la config simplemente no estaba en los paths del candidato B. `git log -S` lo confirma.
- R3-memory-store: storage en memoria del throttler — presupuesto por proceso, no por deployment; documentar o compartir storage si se escala horizontal.
- R1-throttle-env-failfast: positivo — validación al arranque de `AUTH_THROTTLE_*`.

**Del candidato C1**: no había prueba de que nada importara de `backend/dist/generated/prisma`. Verificado: `grep` sobre `backend/src`, tests, Dockerfile y `package.json` no encuentra importers; `prisma generate` corre en el build del Dockerfile y el cliente vive en `node_modules`. Eran una copia obsoleta.

Los 4 de T2 (R1-001 guard de base en la suite e2e, R1-002/R3-cal-params-1 `month`/`year` ignorados, R3-doc-count-1 conteo no reproducible) siguen abiertos como trabajo aparte.

**L10** (estado): review `review-13c85558d4eeaec9` aprobado sobre los commits de docs posteriores; sus 2 hallazgos informativos de redacción se aplicaron ("sin correcciones" precisado a "sin corrección obligatoria", y L9 reescrito para describir el mapeo candidato→linaje real). En el mismo ciclo se corrigió H9 (trust proxy + test RED→GREEN, 12 tests verdes) y se verificó que H10 no era un defecto (`fileParallelism: false` desde `d2411f0`).

## Pendientes (del informe, no de esta feature)

| ID | Qué | Nota |
|---|---|---|
| H8 | Suite del SPA rota: 11 de 14 archivos en rojo | `AuthService.getCurrentUser` usa `localStorage` antes de que el entorno de test lo tenga |
| — | SSH del VPS: `PasswordAuthentication` sigue habilitado, sin fail2ban | Hay fuerza bruta activa contra el 22; requiere autorización sobre el VPS |
| — | Rotar la contraseña de root compartida por chat | Quedó en el historial de la sesión |
| — | Autor del commit `63e009c` del frontend | `trujillo <trujillo@local>`; el policy del harness rechaza `--force-with-lease` |
| — | Rotar y purgar las keys de jsonbin y Cohere de `Follow_Up/main` | Sigue vigente en ese branch |
| — | Doc de operación: logs, backup de Postgres, rollback | — |

## Log

**L1** (user, verbatim): "si vamos a iniciar pero entonces necesito que crees el commmit e inicies y si la app es multiusuario asi que ten en cuenta eso y en el md vas marcando en cual estas solucionando inica trabaja en local relaizas pruebas y despliegas"

**L2** (decision, harness): el backend no tenía runner de tests. Jest + ts-jest es el camino Nest, pero jest 30 recién publicado pierde el transform en Node 26 y el lockfile arrastraba un `jest-util` anidado. Se fijó jest 29 y después se descartó por completo al descubrir que Nest 12 es ESM-only: se pasó a vitest + SWC.

**L3** (decision, base de tests): la suite nunca toca la base de desarrollo ni la de producción. `test/e2e-db.sh` levanta un contenedor desechable en 55432 y `test/global-setup.ts` aplica las migraciones reales, para probar el esquema que se despliega.

**L4** (corrección): el hallazgo M1 del informe afirmaba que el DTO de calendario no validaba rangos. Sí los valida (`@Min`/`@Max`); solo queda la mitad de zona horaria. Corregido en el documento y en su tabla de estado.

**L5** (corrección): el informe afirmaba que el repo documentaba un lockout de login y throttle de emails inexistentes. Era falso: eso venía del compose de otro proyecto del mismo servidor. Corregido en H1.

**L6** (corrección): el informe marcaba C2 como crítico por XSS en el notepad. El único llamador de `insertHtmlAtCursor` pasaba markup constante y el pegado entra como nodo de texto, así que era riesgo latente, no vulnerabilidad activa. Bajó a alta; se eliminó el sink igual.

**L7** (estado, superado por L8): implementación, tests y deploy completos y verificados. El review nativo no pudo correr por configuración del entorno (modelo de las lentes y binario del paquete), no por el candidato. La configuración se arregló después; L8 es el estado final.

**L8** (estado): review nativo aprobado sin correcciones. Los bloqueos eran de entorno: faltaba materializar `models.json` (routing ya definido en `profiles.json`) y correr `gentle-ai sync` tras la actualización de assets. Los 4 hallazgos son informativos; R1-001 (guard de base en la suite e2e) es el único con acción recomendada de código.

**L9** (estado, corregido por el review `review-13c85558d4eeaec9`): el linaje `review-da56a9b1a00f716d` aprobó solo el candidato `a6a3086` (T2). El resto de la rama se revisa como candidatos encadenados por el presupuesto de contexto del revisor: A deploy+docs (linaje `review-8e332370d2c8e9d2`, aprobado, con 3 hallazgos informativos — se corrigió la divulgación de la IP del VPS en este documento), B commit `41b3fcc` como un único candidato reducido (el START congela el HEAD del worktree y difiere contra el `baseRef`; los commits de split fueron solo andamiaje), y C borrado de `dist` en `0f4b9f2` partido en dos mitades (`dist/generated` y `dist/src`). El estado del encabezado refleja cada uno al cerrarse.
