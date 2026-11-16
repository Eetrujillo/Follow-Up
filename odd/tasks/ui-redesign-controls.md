# Control baseline — no se pierde ningún botón

Inventario exhaustivo de controles del frontend actual. Un diseño nuevo está incompleto
si falta cualquiera de estas filas con su etiqueta y su acción. Los datos vienen de
`frontend/src/app/**` (evidencia `archivo:línea` del inventario original).

## Shell / sidebar (presente en las 5 páginas internas)

| Control | Etiqueta actual | Acción |
| --- | --- | --- |
| botón icono | `««` / `»»` | `toggleSidebar()` |
| input texto | placeholder `Buscar...` | busca en `onSearch()` |
| botón icono | `x` (solo con texto) | `clearSearch()` |
| fila resultado (repite) | tipo / título / subtítulo | `goToResult(result)` |
| link nav (5, repite) | `Panel Principal`, `Biblioteca`, `Calendario`, `Estadisticas`, `Bloc de Notas` | `routerLink` + estado activo |
| botón | icono salir + `Cerrar sesion` | `logout()` |

## Dashboard

| Control | Etiqueta actual | Acción |
| --- | --- | --- |
| input texto | placeholder `Nueva tarea...` | `addTask()` con Enter |
| botón | `+` | `addTask()` |
| checkbox (por tarea) | — | `onTaskChange(task)` |
| botón icono (por tarea) | `x` | `deleteTask(task.id)` |
| botón icono | `▶` / `❚❚` | `toggleTimer()` |
| botón icono | flecha de reinicio | `stopTimer()` → vuelve a 25:00 |
| lectura | dona, barras, filas de actividad | solo lectura |

## Library (3 vistas: carpetas → documentos → editor)

| Control | Etiqueta actual | Acción |
| --- | --- | --- |
| miga | `Follow-up` / `Biblioteca` / nombre de carpeta | vuelve a `view='folders'` / `'documents'` |
| miga (sin acción) | nombre del documento | — |
| botón | `+ Nueva carpeta` | `openFolderModal()` |
| tarjeta carpeta (repite) | nombre + `N documentos` | `openFolder(folder)` |
| botón icono destruir (por carpeta) | papelera | `deleteFolder(id, $event)` |
| botón | `‹ Volver` | `goBack()` |
| botón | `+ Nuevo documento` | `openDocModal()` |
| botón (estado vacío) | `Crear primer documento` | `openDocModal()` |
| fila documento (repite) | nombre + `Creado el …` | `openDocument(doc)` |
| botón icono destruir (por doc) | papelera | `deleteDocument(id, $event)` |
| botón editor | `‹ Volver` | `goBack()` (guarda) |
| botón editor | `Guardar` | `onSaveAndGoBack()` |
| textarea editor | placeholder `Empieza a escribir...` | `editorContent` |
| modal carpeta | input `Nombre de la carpeta`, `Cancelar`, `Crear`, cierre por overlay | `saveFolder()` / cerrar |
| modal documento | input `Nombre del documento`, `Cancelar`, `Crear`, cierre por overlay | `saveDoc()` / cerrar |

## Calendar

| Control | Etiqueta actual | Acción |
| --- | --- | --- |
| botón icono | `‹` / `›` | `prevMonth()` / `nextMonth()` |
| celda de día (repite) | número + etiquetas | `openModal(day)` |
| etiqueta de evento (por evento, máx. 2) | título, color propio | `openEventModal(event, $event)` |
| texto | `+N más` | `openEventsList(day.events, $event)` |
| overlay / botón | cierre | `closeModal()` |
| input | placeholder `Ej: Estudiar React` | título del evento |
| muestra de color (5, repite) | punto de color | elegir color |
| botón | `Cancelar` | cerrar |
| botón | `Eliminar` (solo al editar) | `deleteEvent()` |
| botón | `Guardar` | `saveEvent()` |
| modal lista | cierre `x`, `Editar` (por evento) | `editFromList(event, $event)` |

## Notepad

| Control | Etiqueta actual | Acción |
| --- | --- | --- |
| botón | `Guardar en Biblioteca` (deshabilitado sin contenido o sobre el límite) | `openSaveModal()` |
| editor contenteditable | cuerpo de la nota | `onContentChange()` / `onKeyDown` / `onPaste` |
| barra de herramientas | **vacía hoy**; CSS y `format()`/`isActive()` en `.ts` esperan bold, italic, underline | `format(cmd)` |
| botón | `Crear tareas con IA` / `Generando...` (deshabilitado mientras genera) | `generateTasks()` |
| mensaje | error de IA (`aiSuccessMessage` existe en `.ts` y hoy no se muestra) | mostrar estado de éxito y de error |
| modal guardar | input `Nombre de la nota`, `Cancelar`, `Guardar`, cierre por overlay | `saveToLibrary()` |

## Login

| Control | Etiqueta actual | Acción |
| --- | --- | --- |
| input email / input password | email, contraseña | formulario |
| botón icono | ojo (`toggleOjo()`) | mostrar/ocultar contraseña |
| botón submit | `Iniciar sesion` / `Cargando...` (deshabilitado al cargar) | `login()` |
| enlace | `Registrate` | `routerLink="/signup"` |

## Signup

| Control | Etiqueta actual | Acción |
| --- | --- | --- |
| inputs | nombre, email, contraseña, confirmar | formulario |
| botón submit | `Crear cuenta` / `Registrando...` (deshabilitado al cargar) | `register()` |
| enlace | `Inicia sesion` | `routerLink="/login"` |

## Statistics

Sin controles. Obligaciones de lectura: 4 tarjetas de métrica, gráfico semanal y barras de
progreso con `[style.width.%]`. Un rediseño no agrega ni quita controles acá.
