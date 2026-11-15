# auth-multiuser

Feature: multi-user authorization for Follow-Up. The audit (`docs/auditoria-app.md`) found that every business endpoint resolved a "default user" instead of the authenticated one.

**Estado: implementado, probado y desplegado. Bloqueado solo el review nativo (RDD).**

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
| T7 | Review nativo del candidato (RDD) | — | ⛔ bloqueado | — |

## Estado verificado del despliegue (2026-11-15)

- Run `43676083408` en GitHub Actions: **success**. `prod = 3f6cf1e`.
- VPS (`root@66.94.110.162`), clon en `/root/admin/home/projects/victor/Follow-Up`, rama `prod`, submódulo `1de5214`.
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

## Bloqueo abierto: review nativo (RDD)

Linaje **`review-da56a9b1a00f716d`**, estado `reviewing`, intacto. Candidato de un solo commit (`a6a3086`, 7 archivos, 373 líneas, tier high, presupuesto de corrección 187).

- `baseRef` para el STATUS: `4daa180d0b91da48d4cb6586f930ae456569401e`
- `target`: `sha256:6ebd0e1922d309557eedbab8373be51d2e978f608bf08c31f32de4490bb83123`
- Lentes congeladas: `review-risk` + `review-reliability`. Pronóstico de 2 corridas **ya autorizado**.

Dos bloqueos consecutivos, ninguno del código:

1. **`reviewer-config-invalid`** — el proveedor no encuentra modelo para la clave `review-risk`. No existe `models.json` en ninguna ruta candidata: `~/.gentle-shell/gentle-ai/`, `~/.gentle-shell/agent/gentle-ai/`, `~/.pi/gentle-ai/`. La doc del paquete (`docs/readme-reference.md:1107`) da el shape por agente: `{"review-risk": {"model": "proveedor/modelo", "thinking": "high"}}`. Configurarlo desde la pantalla de modelos y **Make default**, incluyendo las cuatro lentes (`review-risk`, `review-reliability`, `review-readability`, `review-resilience`).
2. **`native-status-package-binary-missing`** (el bloqueo actual) — falta el binario `gentle-ai` dentro del paquete instalado. `GENTLE_PI_SKIP_GENTLE_AI_INSTALL` **no** está seteada; el script existe y nunca se ejecutó:

```bash
cd /home/trujillo/.local/share/mise/installs/node/26.13.0/lib/node_modules/gentle-pi
node scripts/install-gentle-ai.mjs
```

Después: STATUS sobre el linaje y, si reofrece las dos bindings, la captura con `reviewerRunAcknowledged: true` (el pronóstico ya está pagado). Las bindings son opacas: **no transcribirlas a mano**, copiarlas del STATUS. Sin el binario no se puede saber si la config de modelos quedó bien.

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

**L7** (estado): implementación, tests y deploy completos y verificados. El review nativo no pudo correr por configuración del entorno (modelo de las lentes y binario del paquete), no por el candidato.
