# Design system — Follow-Up

Fuente única de tokens durante el diseño. Al implementar, este contenido es el
contrato que `frontend/src/styles.css` ya materializa. Valores tomados solo de
las fuentes del proyecto; nada inventado.

Fuentes: `frontend/src/styles.css` (root layer), `frontend/src/styles.css`
(primitivas). Dirección visual vigente: «Instrumento»
(`design/ui-redesign/01-instrumento.html`).

## Colores — superficies

| Token | Valor | Uso | Fuente |
| --- | --- | --- | --- |
| `--canvas` | `#0d0e0f` | Fondo de la app y del campo hundido | `frontend/src/styles.css` |
| `--s1` | `#141617` | Superficie 1: tarjetas, shell | `frontend/src/styles.css` |
| `--s2` | `#1a1d1f` | Superficie 2: tarjetas elevadas, campo enfocado | `frontend/src/styles.css` |
| `--s3` | `#212527` | Superficie 3: hover de controles, chips | `frontend/src/styles.css` |

## Colores — líneas

| Token | Valor | Uso | Fuente |
| --- | --- | --- | --- |
| `--hairline` | `rgba(255, 255, 255, 0.075)` | Bordes de tarjetas | `frontend/src/styles.css` |
| `--hairline-2` | `rgba(255, 255, 255, 0.12)` | Bordes de controles, subrayado de enlaces | `frontend/src/styles.css` |

## Colores — texto

| Token | Valor | Uso | Fuente |
| --- | --- | --- | --- |
| `--t1` | `#f0f2f3` | Texto primario | `frontend/src/styles.css` |
| `--t2` | `#a3abaf` | Texto secundario, placeholder | `frontend/src/styles.css` |
| `--t3` | `#798184` | Texto terciario (solo ≥15px sobre `--s1`) | `frontend/src/styles.css` |

## Colores — roles de estado

| Token | Valor | Uso | Fuente |
| --- | --- | --- | --- |
| `--accent` | `#e0b155` | Acento único: acciones primarias, foco | `frontend/src/styles.css` |
| `--accent-dim` | `rgba(224, 177, 85, 0.16)` | Fondo tenue del acento | `frontend/src/styles.css` |
| `--danger` | `#e2836f` | Error | `frontend/src/styles.css` |
| `--danger-dim` | `rgba(226, 131, 111, 0.09)` | Fondo de error | `frontend/src/styles.css` |
| `--danger-line` | `rgba(226, 131, 111, 0.35)` | Borde de error | `frontend/src/styles.css` |
| `--ok` | `#9cc49c` | Éxito | `frontend/src/styles.css` |
| `--ok-dim` | `rgba(156, 196, 156, 0.12)` | Fondo de éxito | `frontend/src/styles.css` |

## Colores — datos y eventos

| Token | Valor | Uso | Fuente |
| --- | --- | --- | --- |
| `--data` | `#646d71` | Series de gráficos neutras | `frontend/src/styles.css` |
| `--ev-1` | `#e0b155` | Evento calendario 1 | `frontend/src/styles.css` |
| `--ev-2` | `#e2836f` | Evento calendario 2 | `frontend/src/styles.css` |
| `--ev-3` | `#8fb3d9` | Evento calendario 3 | `frontend/src/styles.css` |
| `--ev-4` | `#98c29a` | Evento calendario 4 | `frontend/src/styles.css` |
| `--ev-5` | `#b899cc` | Evento calendario 5 | `frontend/src/styles.css` |

## Forma y movimiento

| Token | Valor | Uso | Fuente |
| --- | --- | --- | --- |
| `--r-ctl` | `3px` | Radio de controles | `frontend/src/styles.css` |
| `--r-box` | `5px` | Radio de tarjetas | `frontend/src/styles.css` |
| `--ease` | `cubic-bezier(0.2, 0.8, 0.25, 1)` | Curva de todo movimiento | `frontend/src/styles.css` |
| `--fast` | `140ms` | Micro-feedback | `frontend/src/styles.css` |
| `--slow` | `260ms` | Momento autorado | `frontend/src/styles.css` |

## Tipografía

| Token | Valor | Uso | Fuente |
| --- | --- | --- | --- |
| `--font-body` | `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` | Todo el texto | `frontend/src/styles.css` |
| `--font-mono` | `ui-monospace, 'SF Mono', Menlo, monospace` | Cifras y datos (`.mono`, tabular-nums) | `frontend/src/styles.css` |

Escala real de la app: body 13px/1.5 peso 400; cifras grandes `.mono` 28px;
títulos de página y chips en 12–13px con peso 500–600. Sin webfonts.

## Componentes (reglas, no copias)

| Componente | Regla | Fuente |
| --- | --- | --- |
| `.btn` | 30px alto, borde `--hairline-2`, radio `--r-ctl`; hover `--s3`; activo `scale(0.985)` | `frontend/src/styles.css` |
| `.btn--primary` | Fondo y borde `--accent`, texto `#17140c`; hover `#eec06a` | `frontend/src/styles.css` |
| `.btn--quiet` | Sin borde, texto `--t2`; hover `--s3` + `--t1` | `frontend/src/styles.css` |
| `.btn--danger` | Borde `--danger-line`, texto `--danger`; hover `--danger-dim` | `frontend/src/styles.css` |
| `.icon-btn` | 30×30, icono SVG `.ic`; mismo contrato de estados que `.btn` | `frontend/src/styles.css` |
| `.field` | 30px alto, fondo `--canvas` (hundido), foco `--accent` + `--s2`; placeholder `--t2` | `frontend/src/styles.css` |
| `.card` | Fondo `--s1`, borde `--hairline`, radio `--r-box` | `frontend/src/styles.css` |
| `.ic` | SVG inline trazo 1.5, grilla 20px, `currentColor`; 16px (sm 14, lg 18) | `frontend/src/styles.css` |
| `:focus-visible` | Anillo 2px `--accent`, offset 2px, en todo control | `frontend/src/styles.css` |
| `prefers-reduced-motion` | Todo movimiento a 0.01ms; sin transform en `:active` | `frontend/src/styles.css` |

Reglas duras del proyecto: ningún hex suelto fuera del root; ningún glifo
Unicode como icono; un solo momento de motion por pantalla; estados completos
(hover/focus/active/disabled/carga/vacío/error) en todo control.
