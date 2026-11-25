# Motion redesign — Instrumento en movimiento

Full-app visual redesign (composition only, identity kept) plus a Tier 4 motion layer:
WebGL hero on auth, Lenis smooth scroll, magnetic cursor, card tilt, and the Tier 3 spine
(FLIP + View Transitions) underneath. Branch: `feat/motion-redesign`.

## Specs

- **S1** — «vamos a hacer un rediseño completo de la app con animaciones […] no te limites».
  Every screen is redesigned; the motion layer is not an optional extra.
- **S2** — Motion inventory before code: `elemento | trigger | propiedades | duración | easing`.
  No row, no animation. The approved 33-row inventory is the contract; a new animation needs a new row.
- **S3** — Compositor-only properties (`transform`, `opacity`, `clip-path`). Never `width`, `height`,
  `top`, `left`, `box-shadow`, `filter` in a hot path. One declared exception: `stroke-dashoffset`
  on the 12×12px task check mark.
- **S4** — Easing is a named project token (`--ease`, `--ease-lock`, `--ease-exit`, `--ease-ink`).
  No curve copied from the sampled corpus, no inline magic numbers.
- **S5** — Visible by default: no `opacity:0` for content in CSS. Start states are applied by JS via
  `data-motion="on"` on `<main>`, after it is known to run.
- **S6** — Degradation branches shipped in the same file as the motion: reduced motion zeroes the
  duration tokens (form 1 of `degradation.md`), mobile gets its own calmer branch, no-JS stays readable.
- **S7** — Human chose **Tier 4**: WebGL hero on auth, Lenis smooth scroll, magnetic cursor with lerp,
  tilt on cards. Chosen over Tier 3 knowing the costs; the Tier 3 spine ships underneath it.
- **S8** — Human chose to **keep «Instrumento»**: `#0d0e0f`, `#e0b155`, hairlines, system-ui, radii 3/5px
  do not change. What changes is composition (density, hierarchy, focal card) and motion.
- **S9** — Build budgets are hard constraints: `anyComponentStyle` 8kB error, `initial` 500kB warn.
  The shared motion layer lives in `frontend/src/styles.css`, never duplicated per component.
- **S10** — WCAG 2.2.2: zero infinite automatic loops. WCAG 2.3.3: every interaction-triggered motion
  is disableable through the reduced-motion branch.

## Tasks

| ID | Task | Route | Commit |
| --- | --- | --- | --- |
| T1 | Motion foundation: tokens, reduced-motion branch, no-JS safety, shared helpers (FLIP, lerp, IO, quality ladder) | inline | `feat(motion): add the motion foundation` |
| T2 | Shell: ink nav marker, route View Transitions, sidebar collapse without layout animation | inline | — |
| T3 | Dashboard composition (focal + support + detail) and entrance settle, charts, task rows | worker | — |
| T4 | Statistics: `scaleX` progress replace, count-up, featured hierarchy | worker | — |
| T5 | Library: folder→document morph, trash FLIP, modal/toast | worker | — |
| T6 | Calendar: direction-aware month wipe, row stagger, modal | worker | — |
| T7 | Notepad: toolbar state, save confirmation, static editor | worker | — |
| T8 | Auth: kinetic line reveal, WebGL hero with DPR ladder, poster fallback | inline | — |
| T9 | Tier 4 layer: Lenis, magnetic cursor, card tilt, capability gates | inline | — |
| T10 | Verification: build, budgets, tests, RM/touch/no-JS/keyboard paths; design/system.md motion section | inline | — |

## Log

- **L1** (user, verbatim) — «vamos a hacer un rediseño completo de la app con animaciones    Integrá animaciones en esta página siguiendo el skill extravagant-web-motion (leé SKILL.md completo antes de escribir, y después references/corpus.md, restraint.md, fluidity.md y degradation.md). Contexto de la página: [URL o archivo de la página] Qué quiero que se anime: [describí las secciones o el efecto que buscás] Requisitos, en este orden: 1. ANTES DE ESCRIBIR CÓDIGO, entregame para aprobación: - El motion inventory: elemento | trigger | propiedad | duración | easing. Sin fila no hay animación. - El tier elegido (1 CSS / 2 GSAP / 3 FLIP-VT / 4 pipeline) y el motivo en una línea. - El presupuesto de saturación declarado: 1 motion focal por viewport, ≤1 loop con control de pausa, ≤1 escena con scrub, settle de entrada ≤1.2s, área en movimiento ≤35% del viewport. 2. AL IMPLEMENTAR: - Sólo propiedades de compositor: transform, opacity, clip-path. Nunca width/height/top/left/box-shadow/filter en el hot path. - CSS transitions para lo que debe sobrevivir un stall del main thread (nav, hover, links); GSAP solo para timelines y scrub, con Lenis sincronizado al ticker si hace falta. - Easing nombrado como tokens propios del proyecto; no copies la curva de ningún sitio de referencia. - Contenido visible por default: los estados iniciales ocultos los aplica el JS, nunca el CSS solo. - Cero hacks translate3d(0,0,0)/translateZ(0); will-change solo en la ventana de 200ms previa y removerlo después. - Sin blur animado en áreas grandes; backdrop-filter en máximo 3 elementos por viewport; nunca glass animado sobre un video en reproducción. - Lecturas de geometría agrupadas antes que las escrituras; nunca intercalar read/write en el mismo frame. - quickTo/quickSetter para eventos de alta frecuencia (pointermove); nunca crear tweens dentro del handler. 3. DEGRADACIÓN, escrita primero, no al final: - prefers-reduced-motion con una de las cuatro formas probadas; nunca "ninguna". - Rama mobile más calma, no una versión comprimida de la desktop. - Sin JS la página tiene que leerse completa. - Motion automático o repetido >5s con control de pausa visible (WCAG 2.2.2); motion disparado por interacción desactivable (2.3.3). no te limites»
- **L2** (decisions, this session) — Tier: **Tier 4 · Inmersivo completo** (human choice over the recommended Tier 3). Scope: **mantener «Instrumento», rediseñar composición**.
- **L3** (evidence) — Explorer map: no motion libraries, no IntersectionObserver, no Angular Animations, no View Transitions, single dark theme, tokens at `styles.css:9-58`, reduced-motion kill switch at `styles.css:316`. Latent defects found: `.dot--pulse` infinite loop with no pause (`dashboard.css:291-296`, WCAG 2.2.2), `.progress-bar-fill` transitioning `width` (`statistics.css:183`), `.sidebar` transitioning `width` (`sidebar.css:14`).
- **L4** (decision) — Tier 4 dependencies: `lenis` only. The WebGL hero is raw WebGL2 instead of three.js (~6KB vs ~160KB gzipped for one full-screen shader), and the magnetic cursor / tilt use one shared rAF loop instead of GSAP `quickTo`, since GSAP would be 70KB for two setters. Same visual result, inside F1 with room to spare.

## Inventory addendum — Tier 4

The approved table had 33 rows. Tier 4 (S7) added four surfaces that were not in it; they are listed here
because the contract is "no row, no animation".

| # | Element | Trigger | Properties | Duration | Easing |
| --- | --- | --- | --- | --- | --- |
| 34 | `.auth-hero` canvas | mount, once | WebGL fragment pass, `u_settle` 0→1 | 1200ms, then **stops** | cubic-out sampled in the shader's settle value |
| 35 | `.main-content` scroll | wheel | Lenis virtual scroll | `duration: 0.25` (B6 cap) | `1-(1-t)^3` |
| 36 | `.m-cursor` ring | `pointermove` | `transform` lerp 0.15/frame, `opacity` on enter/leave | continuous, stops on pointerleave | `--ease` on opacity |
| 37 | `[data-magnetic]` targets | `pointerenter` | `transform`, ≤6px toward pointer | per frame, return in `--t-micro` | `--ease` on return |
| 38 | `[data-tilt]` targets | `pointerenter` | `perspective(800px) rotateX/Y`, ≤3.5° | per frame, one element at a time | `--t-micro` on return |

Row 32 (the spinner) stays the only non-composited micro-animation in the app. No infinite automatic loop
exists anywhere: the hero settles and stops, the scroll is event-driven, the pointer needs a pointer.

## Log (cont.)

- **L5** (defect found and fixed) — Angular's `ShadowCss` appends the content attribute to every compound
  selector, so `[data-motion='on'] .x` written in a *component* stylesheet compiles to
  `[data-motion='on'][_ngcontent-…] .x` and never matches. Five rules in calendar, five in notepad and one
  in statistics were dead. Fixed by removing the gate from component CSS (those rules are already JS-driven)
  and keeping it only in the global sheet, where it is unscoped. Library uses `:host-context([data-motion='on'])`,
  which is the only form that survives encapsulation and is kept deliberately.
- **L6** (pre-existing, not fixed here) — the unit suite is red before and after this work with the identical
  count: 9 files / 28 tests failing, 28 passing. Reproduced on a detached worktree at the base commit
  `f3cb426`; root cause is `TestBed` instantiation order in the specs (`Cannot configure the test module when
  the test module has already been instantiated`). Out of scope for this feature and reported, not silenced.
- **L7** (deviations, all deliberate) — (a) the sidebar ink marker is interpolated by the View Transition
  rather than a JS FLIP: same result, zero geometry reads; (b) statistics/chart durations go through
  `duration(700)` instead of a literal; (c) the hero panel is `inset: 0 0 30% 0` so its moving area measures
  ~28% of the viewport, inside B4; (d) modal elevation shadows were dropped for identity consistency
  («Instrumento» builds hierarchy with hairlines) — if they are wanted back they need a token, not a literal.
- **L8** (residual risk) — Lenis owns the wheel on `.main-content`. The page behind an open modal can still
  scroll natively; that behaviour pre-dates this work (no scroll lock existed before either) and fixing it
  properly is a separate unit across three components. Nested scrollers use the declarative
  `data-lenis-prevent` attribute so the prevent callback never reads computed style per wheel event.

## Delivery shape

Four commits on `feat/motion-redesign` of the `frontend` submodule, one per reviewable unit:
foundation (tokens + degradation), shell (view transitions + rail), the five screens, and the Tier 4
layer. Total `f3cb426..HEAD`: 33 files, 2536 insertions, 961 deletions.

That is past the ~400 authored-line slice, and it is the whole feature, not one unit inside it: the
submodule pointer is a single line in the parent, so the sequence cannot be published as chained PRs
without splitting the submodule history. Recorded here so the reviewer sees the size before opening
the diff. A follow-up could split the Tier 4 layer (hero, Lenis, pointer) into its own branch if the
review needs to land in stages.
