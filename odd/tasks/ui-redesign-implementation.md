# Implementación del rediseño «Instrumento» — brief para escritores

Spec: `odd/tasks/ui-redesign.md`. Inventario de controles: `odd/tasks/ui-redesign-controls.md`.
Spec visual: `design/ui-redesign/01-instrumento.html` (el artboard elegido).

## Contrato global (ya hecho, no lo repitas)

`frontend/src/styles.css` tiene los tokens y las primitivas. **Prohibido declarar un hex suelto en un
componente**: usá `var(--*)`. Disponibles:

- Superficies `--canvas --s1 --s2 --s3`; líneas `--hairline --hairline-2`; texto `--t1 --t2 --t3`;
  roles `--accent --accent-dim --danger --danger-dim --danger-line --ok --ok-dim --data`;
  eventos `--ev-1..--ev-5`; forma `--r-ctl --r-box`; motion `--ease --fast --slow`;
  fuentes `--font-body --font-mono`; shell `--sidebar-w --sidebar-collapsed`.
- Primitivas listas: `.btn` (+ `--primary --quiet --danger`), `.icon-btn` (+ `--danger`), `.field`,
  `.card`, `.mono`, `.ic .ic--sm .ic--lg`, `.sr-only`.
- Ya resuelto global: `box-sizing`, `:focus-visible` (anillo de 2px), `::selection`, scrollbars,
  caret, `prefers-reduced-motion`, peso y tamaño base del body.

No redefinas esas primitivas en un componente. Si necesitás una variante, usá una clase propia
(`.task-row__del`) y componela con la primitiva.

## Iconos

Prohibido usar glifos como iconos (`««`, `›`, `x`, `+`, `⊞`, `▶`, `❚❚`). Cada icono es un SVG inline
en el template, trazo `1.5`, `viewBox="0 0 20 20"`, `fill="none"`, `stroke="currentColor"`,
`stroke-linecap="round"`, `class="ic"` (o `ic--sm`/`ic--lg`), y `aria-hidden="true"`.
Un botón que solo lleva icono **necesita** `aria-label` o `title` en español.

## Reglas que no se negocian

1. **Ningún control se pierde ni se agrega.** Aritmética del inventario: mismas acciones, mismos
   handlers, mismos `[(ngModel)]`, mismos `@if`/`@for`, mismos `[disabled]`, mismos
   `stopPropagation`/`preventDefault`. Si el template actual llama `deleteFolder(folder.id, $event)`,
   el nuevo también.
2. **Un solo momento de motion por pantalla** (el que declare su sección), 140–260 ms, `--ease`,
   solo `transform`/`opacity`/`filter`. Micro-feedback en cada control (hover/press/focus) vía las
   primitivas. Nada de animación de entrada por sección.
3. **Estados completos**: hover, `:focus-visible`, `:active`, `:disabled`, carga, vacío y error.
   Donde hoy la app cambia texto plano ("Cargando...", "Generando...") ahora va texto + spinner CSS
   (borde girando, `aria-busy="true"`), sin inventar controles nuevos.
4. **Accesibilidad**: `role`/`aria-label` donde el control es un `div` o `span` clickeable; celdas y
   filas clickeables pasan a `tabindex="0"` con `(keydown.enter)` y `(keydown.space)`;
   modales con `role="dialog" aria-modal="true"` y cierre con `Esc` vía `@HostListener` en el `.ts`.
5. **Ningún cambio de comportamiento**: si un handler tenía un bug conocido (por ejemplo
   `aiSuccessMessage` que nunca se renderiza, o el botón de reset que en realidad reinicia),
   arreglar el template para mostrarlo **no** cambia la lógica del `.ts` salvo lo indicado en la
   sección de esa página.

## Prohibiciones de proceso

- No toques archivos fuera de tu `## Allowed edit surfaces`.
- **No corras `ng build` ni `ng serve`**: 7 unidades escriben en paralelo y comparten `node_modules`.
  La verificación de compilación la hace el padre al final.
- No agregues dependencias, no cambies `package.json`, no crees componentes nuevas salvo que tu
  sección lo pida explícitamente.

## Plantilla de respuesta

Devolvé: archivos tocados con líneas, tabla de controles preservados (baseline → selector nuevo),
qué estados y accesibilidad agregaste, y cualquier desvío consciente del artboard.

---

## Shell + sidebar (T6)

Archivos: `frontend/src/app/app.html`, `app.css`, `app.ts`, `components/sidebar/*`.

- `app.css`: borrar el reset duplicado y el `body` hardcodeado (ya está en `styles.css`). Dejar
  `.app-layout` (flex, 100vh, overflow hidden) y `.main-content` (flex 1, scroll vertical, `min-width:0`)
  con tokens. El fondo sale de `--canvas`.
- `app.ts`: `showSidebar` arranca en `false` y se calcula desde la ruta para eliminar el flash del
  sidebar en login/signup. Mantené `hiddenRoutes = ['/login','/signup']`.
- `sidebar.css`: reescribir sobre tokens. Superficie `--s1`, borde derecho `--hairline`, ancho
  `--sidebar-w` / `--sidebar-collapsed`, transición de ancho `--slow` (es el momento autorado del
  shell). Etiquetas que se desvanecen con `opacity` cuando está colapsado (`--fast`), sin reflow.
  Link activo: `--s2` + texto `--t1` + icono `--accent`; inactivo `--t2`.
- `sidebar.html`: reemplazar los glifos por SVG inline; buscador con icono y botón limpiar
  (`aria-label="Limpiar búsqueda"`); resultados con `role="button" tabindex="0"` y Enter/Espacio;
  `nav` con `aria-label="Navegación principal"`; toggle con `aria-label` dinámico
  ("Colapsar/Expandir barra lateral") y `[attr.aria-expanded]`.
- Foco visible obligatorio en el buscador (hoy tiene `outline:none` sin reemplazo).

## Dashboard (T7)

Archivos: `frontend/src/app/pages/dashboard/*`.

- Header: título + fecha con `.mono`. Grilla: input `Nueva tarea...` + `+` en una fila con hairline;
  cada tarea en un `.task-row` de 44px con checkbox SVG (marca animada con `stroke-dashoffset`,
  180 ms, solo en el check), texto tachado con transición de `color`/`text-decoration` al completar,
  y el `x` de borrar que aparece en hover **y** en `:focus-within` (nunca `display:none`).
- Timer: cifra en `.mono` 28px con `--t1`; play/pausa y reset con SVG; el bloque pasa a `--accent`
  cuando corre. Botón de reset: mantener `stopTimer()` y su ícono de reinicio.
- Dona y barras: paleta desde tokens. `dashboard.ts` tiene los colores hardcodeados de Chart.js
  (`#3b82f6`, `#2a2a2a`, `#666`): reemplazalos por lectura de tokens con
  `getComputedStyle(document.documentElement).getPropertyValue('--accent')` y equivalentes, para
  que el tema no se desincronice. Nada más del `.ts` cambia.
- Estado vacío de tareas y de actividad (hoy no existe): texto `--t3` que dice qué hacer.
- Momento autorado de la pantalla: el check de la tarea.

## Library (T8)

Archivos: `frontend/src/app/pages/library/*`.

- Tarjetas de carpeta sobre `--s1` con hairline y hover que sube `translateY(-1px)` + borde
  `--hairline-2`; papelera visible en hover y `:focus-within`, con `aria-label` que nombre la carpeta.
- Filas de documento de 44px separadas por hairline (no tarjetas), con `Creado el …` en `--t3` y
  fecha `.mono`.
- Migas: los `span` clickeables pasan a `button` con apariencia de enlace; la miga del documento
  actual queda como `aria-current="page"` sin acción (así está hoy).
- Modales ("Nueva carpeta", "Nuevo documento"): `role="dialog" aria-modal="true"`, superficie `--s2`,
  borde `--hairline-2`, una sola sombra (`0 24px 48px -12px rgba(0,0,0,.7)`), entrada de 180 ms con
  `opacity` + `translateY(4px)`, focalizar el input al abrir, `Esc` cierra. Mantener el cierre por
  clic en el overlay y los `stopPropagation` existentes.
- Estado vacío de documentos: el artboard lo muestra con `Crear primer documento`.
- Momento autorado: la entrada del modal.

## Calendar (T9)

Archivos: `frontend/src/app/pages/calendar/*`.

- Grilla 7 columnas con hairlines; día de hoy con borde `--accent` y número en `--accent`; celdas
  clickeables con `role="button" tabindex="0"` y Enter/Espacio (las celdas vacías mantienen
  `pointer-events:none` y `aria-hidden`).
- Chips de evento con el color del evento desde `calendar.ts` (los 5 colores pasan a `--ev-1..5`);
  chip como `button` (un `<button>` no puede contener otro); `+N más` como `button` con
  `aria-label` "Ver los N eventos del día".
- Modal de evento: `role="dialog" aria-modal="true"`, `Esc` cierra, input con foco inicial, 5 muestras
  de color como `button` con `aria-pressed`, `Eliminar` solo en edición.
- Modal de lista: mismas reglas; `Editar` por evento.
- Momento autorado: la entrada del modal.

## Notepad (T10)

Archivos: `frontend/src/app/pages/notepad/*`.

- Implementar la barra de herramientas **vacía** con los botones que el CSS y el `.ts` ya esperan:
  negrita, cursiva y subrayado, llamando a `format('bold'|'italic'|'underline')`, con estado activo
  desde `isActive()` y `aria-pressed`. Esto reusa código muerto; no agrega comportamiento nuevo.
- Editor: `--s1`, borde `--hairline-2`, foco `--accent`, placeholder en `--t3`, `caret-color` del acento.
- `Guardar en Biblioteca` con `[disabled]="!hasContent || isOverLimit"` intacto; `Crear tareas con IA`
  con spinner cuando `generating` y `aria-busy`.
- Renderizar `aiSuccessMessage` (hoy se escribe y no se muestra) junto a `generateError`; ambos sobre
  tokens (`--ok` / `--danger`), sin `style` inline.
- Modal "Nombre de la nota" con las reglas de modal del resto.
- Momento autorado: la entrada del modal de guardado.

## Statistics (T11)

Archivos: `frontend/src/app/pages/statistics/*`.

- Cero controles: no agregues ninguno.
- Cuatro métricas: la primera con jerarquía distinta (cifra grande `.mono` 28px), las otras tres
  como filas con hairline; nada de 4 tarjetas idénticas.
- Barras de progreso y gráfico semanal con tokens; `statistics.ts` tiene colores hardcodeados:
  mapealos a tokens igual que en dashboard.
- Estado vacío cuando no hay datos.
- Momento autorado: el ancho de las barras de progreso (`width` con `--ease`, `--slow`).

## Login y Signup (T12)

Archivos: `frontend/src/app/pages/login/*`, `frontend/src/app/pages/signup/*`.

- Card centrada en el canvas: `--s2`, borde `--hairline-2`, `--r-box`, una sombra; ancho máximo 380px.
- Campos con `.field`; el ojo pasa de `span` a `button` con `aria-label` ("Mostrar/Ocultar
  contraseña") y `aria-pressed`.
- Submit: `.btn--primary` a ancho completo, con spinner + texto cuando `isLoading` y `[disabled]`
  intacto. En signup, el submit hoy se estiliza por el selector `button{}` genérico: dale clase
  explícita y borrá las reglas genéricas.
- `Registrate` / `Inicia sesion` de `span[routerLink]` a `a[routerLink]` reales.
- Errores de campo y de caja sobre `--danger`; éxito sobre `--ok`. Sin hex sueltos.
- Momento autorado: la entrada de la card (una sola, `opacity` + `translateY(6px)`, 260 ms).
