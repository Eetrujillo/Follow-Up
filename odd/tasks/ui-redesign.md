# UI redesign — Follow-Up

Rediseño visual completo del frontend Angular (7 páginas + shell), preservando el
minimalismo y la totalidad de los controles existentes. Entrega actual: 3 direcciones
de diseño en HTML para elegir. La implementación en Angular ocurre después de la elección.

## Specs

- **S1** — «vamos a rediselar toda la interfaz de la app»: las 7 páginas (`dashboard`,
  `library`, `calendar`, `statistics`, `notepad`, `login`, `signup`) y el shell
  (`sidebar` + `main`) entran en el rediseño. Ninguna página queda fuera.
- **S2** — «que no se pierda lo minimalista»: sin decoración que no informe. Superficies
  planas o con una sola sombra funcional; un solo acento; sin gradientes de texto, sin
  glass decorativo, sin bordes de color laterales, sin emojis como iconos.
- **S3** — «quiero animaciones interacciones con los botones detalles que sena lo que le
  agregue valoa a la app»: feedback de puntero y teclado en todo control, estados de
  carga reales, y **un** momento de motion autorizado por pantalla. Nada más.
- **S4** — «ten cuidado para que nose vaya perder un boton por hay»: cada control de
  `odd/tasks/ui-redesign-controls.md` aparece en el diseño, con su etiqueta y su acción.
  Cero controles perdidos, cero controles inventados.
- **S5** — «dame opciones para elgir diseño»: 3 direcciones claramente distintas en
  estructura y estrategia visual, no en color. Cada una declara su tradeoff.
- **S6** — «pon a prueba todas las skills y que no vayan a contradecir»: una sola regla
  resuelta por conflicto, registrada en «Reconciliación de skills». Ninguna skill se
  aplica contra otra sin dejar la decisión escrita.
- **S7** (L6) — «arregla la parte del reloj»: el Pomodoro sobrevive la navegación.
  Salir del dashboard a otra página NO borra el estado; al volver, si estaba
  corriendo se descuenta el tiempo ausente con ancla de época y sigue su cuenta.
  Sigue aislado por cuenta de usuario.
- **S8** (L6) — «el login está muy simple, crea un diseño»: el login gana un
  tratamiento visual con más diseño (su par signup en la misma familia para no
  dejarlos contradictorios), sobre un artboard nuevo en el lienzo, implementado
  tras aprobación del humano. Mismos controles del inventario, ninguna pérdida.

### Reconciliación de skills (vinculante)

| Conflicto | Resolución |
| --- | --- |
| `gentle-design` exige stack de fuentes del sistema y cero recursos externos; `frontend-design` pide tipografía elegida, no la por defecto | Se elige el par tipográfico **del sistema** que corresponda a cada mundo (`ui-serif`/Georgia vs `system-ui` vs `ui-monospace`), con escala y pesos deliberados. Sin CDN, sin webfonts. |
| `impeccable` craft-floor: prohibe glifos Unicode/emoji como iconos; hoy la app usa `««`, `⊞`, `▣`, `‹›`, `x`, `+` | Iconos SVG inline autorados, un solo grosor de trazo (1.5px) y una sola grilla (16/18/20px). Mismo control, misma acción, icono real. |
| `impeccable` craft-floor: «un momento de motion autorado», no una entrada idéntica por sección; `web-animation-design` propone scroll-reveal por sección | Gana craft-floor. Micro-interacciones en controles (< 200 ms) + **un** momento autorado por pantalla (320–420 ms, ease-out exponencial). Sin reveal por sección. |
| `ui-ux-pro-max` (datos) sugiere 200–250 ms y desplazamiento < 2 px para hover; `apple-design` pide física de spring interruptible | Se usan los tiempos de `ui-ux-pro-max` con `cubic-bezier` de salida exponencial (aprox. de spring) y solo `transform`/`opacity`/`filter`. Toda interacción es interrumpible y reversible con la salida del puntero. |
| `impeccable` craft-floor: un modal para lo que no necesita interrupción está mal; la app ya usa modales para crear carpeta/documento/evento/nota | Se conservan los modales: son contratos existentes y protegen foco (S4). Se los dota de sombra real, `Esc` y foco inicial. |
| `ui-ux-kit` pide un `DESIGN_SYSTEM.md`; `gentle-design` pide `design/system.md` | `design/system.md` es la fuente única durante el diseño; al implementar, el mismo contenido se publica como `frontend/DESIGN_SYSTEM.md`. No se mantienen dos verdades. |
| `better-colors` exige tokens semánticos y contraste medido; la app tiene 7 rojos y 5 grises para el mismo rol | El rediseño declara tokens semánticos (`--surface-1..3`, `--text-1..3`, `--accent`, `--danger`, `--ok`) y prohíbe hex sueltos en componentes. |

## Tasks

- T1 — Dirección A «Instrumento»: `design/ui-redesign/01-instrumento.html` (974 líneas) — commit: pendiente
- T2 — Dirección B «Capas suaves»: `design/ui-redesign/02-capas-suaves.html` (1363 líneas) — commit: pendiente
- T3 — Dirección C «Riel único»: `design/ui-redesign/03-riel-unico.html` (1402 líneas) — commit: pendiente
- T4 — Manifiesto `design/ui-redesign/design.json` + lienzo abierto — commit: pendiente
- T6 — Shell + sidebar (`app.html`, `app.css`, `app.ts`, `sidebar/*`) — hecho, sin commit
- T7 — Dashboard + paleta de charts (`dashboard/*`) — hecho, sin commit
- T8 — Library (`library/*`) — hecho, sin commit
- T9 — Calendar (`calendar/*`) — hecho, sin commit
- T10 — Notepad, incluida la barra de herramientas muerta (`notepad/*`) — hecho, sin commit
- T11 — Statistics (`statistics/*`) — hecho, sin commit
- T12 — Login + Signup (`login/*`, `signup/*`) — hecho, sin commit
- T13 — Verificación: build exit 0, suite 46/46, aritmética de controles sin pérdidas, 0 hex sueltos, 5 modales con `role="dialog"` — hecho
- T14 — Corrección de los blockers del verificador (calendario, suite, foco de notepad, foco de library, budget de dashboard) — hecho
- T15 — Corrección de los defectos visuales del render real (ancho de card, superficies, placeholder, sidebar con query string, scroll en apaisado, foco de inputs) — hecho
- T16 — Pendiente de decisión humana: crear rama `feat/ui-redesign` en el submódulo y commitear por unidad de trabajo; falta verificar el render de las 5 páginas internas, que exige backend + Postgres
- T17 — Reloj: el dashboard adopta `TimerService` (pausa/reanudación real, por cuenta, con ancla `startedAt`); `ngOnDestroy` deja de borrar el estado — RED→GREEN
- T18 — Diseño nuevo del login: artboards en `design/login-auth/` + aprobación del humano — hecho: 3 direcciones, humano eligió **«Doble plano»** (`01-doble-plano.html`)
- T19 — Implementar el login (y par signup) tras la aprobación — hecho: split de auth en `styles.css` (grid 2fr/3fr, panel de identidad + card), login y signup migrados con la aritmética de controles intacta y sin cifras inventadas en el panel; suite 15/50, build exit 0, renders verificados a 1440px (login, signup) y 420px (móvil, panel colapsado)

## Log

- **L1** (pedido del humano, literal): «ahora vamos a rediselar toda la interfaz de la app pero que no se pierda lo minimalista quiero animaciones interacciones con los botones detalles que sena lo que le agregue valoa a la app pero ten cuidado para que nose vaya perder un boton por hay dame opciones para elgir diseño pon a prueba todas las skills y que no vayan a contradecir»
- **L2** (evidencia de T1-T4): inventario de `frontend/src/app/**` con 45 controles y 14 riesgos de pérdida documentado en `odd/tasks/ui-redesign-controls.md`. Las 3 direcciones se escribieron en paralelo por 3 escritores con superficies disjuntas, y se verificaron con: parser HTML (0 desbalanceadas), grep de recursos externos (solo `xmlns`), conteo de etiquetas del baseline (33/33 en cada artboard) y render real en Chromium a 1280 px. Defectos encontrados mirando el render y corregidos antes de entregar: B tenía el icono de búsqueda sin clase de tamaño (svg a 300 px, rompía el sidebar) y `.ic` sin `display:block`; C tenía `body` sin padding horizontal, `.art` fijo en 1280 px desbordando el contenedor, el panel abierto tapando el título y el dashboard recortado a 640 px; A tenía el scrim del modal a .62 y las tarjetas de carpeta quedaban ilegibles detrás.
- **L3** (dirección elegida por el humano): **A · Instrumento**, elegida por el humano sobre los 3 artboards. Implementación completa en el submódulo `frontend` (7 páginas + shell), sin commit.
- **L4** (verificación independiente): veredicto inicial **NO APTO** por dos blockers reales, ambos corregidos: (1) el calendario enviaba `var(--ev-N)` como `colorHex` y el backend lo rechaza con `@IsHexColor()`, así que crear y editar eventos devolvía 400 en silencio — ahora viaja hex real espejo de los tokens, con test de regresión RED→GREEN; (2) la suite quedó en rojo por el patrón de detección zoneless (NG0100), matchers Jasmine en vitest y un stub de router sin la ruta `login`, más el foco del modal de notepad con `setTimeout` antes del render (ahora `afterNextRender`, como library).
- **L5** (verificación visual con navegador real): encontró la card de auth clavada en 286px por un `auth-wrap` sin ancho (ahora 380px medidos), la card sobre `--s1` donde el brief pedía `--s2`, campos del mismo color que la card, placeholder en 4.57:1, el sidebar renderizándose en `/login?registered=true` (bug preexistente del flujo real signup→login, ahora comparison por pathname con test) y el signup cortado en teléfono apaisado (ahora `:host` con scroll). Todo corregido y medido por CDP.
- **L6** (pedido del humano, literal): «no me gusto el login esta muy simple crea un diseño a y arregla la parte del reloj por que cuando lo inicio y voy a otra parte de kas pagina por ejemplo a calendario y luego regreso se reinicia como si nuncca lo hubiera tocado». Causa raíz del reloj hallada: `ngOnDestroy` del dashboard ejecuta `localStorage.removeItem('pomodoro')` — salir de la página borra el estado a propósito, y la clave cruda no tiene ancla de época; `TimerService` (por cuenta, con `startedAt`) era código muerto. Orden acordado: reloj primero (comportamiento), diseño del login después (requiere aprobación del humano).
- **L7** (T17, reloj): RED observado (2 tests nuevos de supervivencia del Pomodoro fallando contra el dashboard, `'pomodoro'` crudo y `removeItem` en `ngOnDestroy`) → dashboard adopta `TimerService` (`restore()` con ancla `startedAt`, `save()` con `startedAt: isRunning ? Date.now() : null`, `ngOnDestroy` deja de borrar) → GREEN: suite completa 15 archivos / 50 tests + build exit 0. El servicio ganó 2 tests: reanudación por ancla (538–540s tras 60s fuera) y fin no-negativo (ausencia ≥ restante → detenido en 0).
- **L8** (T18, login): sync del design system corrido (fuentes: `frontend/src/styles.css`; 27 tokens de color + 8 de forma/movimiento + tipografía → `design/system.md` + `design/system.html`). Nuevo diseño `design/login-auth/` con 3 direcciones: «Doble plano» (panel de identidad + formulario), «Foco total» (columna única tipográfica) y «Mesa de trabajo» (retícula hairline, card como hoja con una sombra, franja con el estado de la semana). Misma aritmética de controles del login actual; el signup hereda la dirección elegida.
- **L9** (T18–T19, implementación «Doble plano»): el panel de identidad leyó las filas con descripciones reales de las áreas (no cifras que antes del login serían inventadas). Defecto del primer render corregido: los SVG de fila sin tamaño intrínseco se hinchan (rompían el layout); 16px + `display:block` fijado. Trampa de la verificación visual: un server de Node sin Content-Type correcto silencia `type="module"` (pantalla negra); verificar con servers que emitan MIME. Suite final 15 archivos / 50 tests, build exit 0.
