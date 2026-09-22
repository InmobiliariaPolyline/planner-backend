# Parche 020: responsable automático, se quita «depende de», y nueva pestaña «Tareas»

## Qué se pidió

1. Al crear una tarea, quien la crea debe quedar como responsable
   automáticamente (no se escribe a mano).
2. Quitar el campo «Depende de» de las tareas; no hace falta por ahora.
3. Entre «Cronograma Gantt» e «Historial», agregar una pestaña nueva con el
   listado desglosable de las tareas del expediente (solo las que siguen
   existiendo, del propio expediente): al hacer clic se ve el ID de la
   tarea, el nombre, el responsable, y cada material elegido con su
   categoría, cantidad, los valores de su métrica y el total de materiales
   de la tarea.

## Qué se construyó

### Responsable automático

- **`TaskFormModal.tsx`**: el campo de texto «Responsable» desaparece del
  formulario. En su lugar se muestra una línea de solo lectura:
  «Responsable: **{nombre}**» — al crear, el nombre de quien tiene la
  sesión abierta (o «Colaborador (enlace)» si se crea desde un enlace
  público); al editar, el responsable original de la tarea (no se puede
  reasignar desde ahí).
- **`PlannerApp.tsx` / `SharedExpediente.tsx`**: `saveTask` ya no lee
  `ownerName` del formulario; al crear lo fija con el usuario de la sesión
  (o el texto fijo del enlace público), y al editar no lo manda en el
  `PATCH` (el backend, si no recibe el campo, no lo toca — sigue igual que
  antes de este parche).

### Se quita «Depende de»

- El campo ya no aparece en el formulario de alta/edición ni en la fila de
  cada tarea del Gantt («Depende de: …» ya no se muestra).
- No fue necesaria una migración: el backend ya trataba `dependency` como
  opcional (si no llega, guarda `''`), así que dejar de enviarlo es
  seguro.

### Nueva pestaña «Tareas»

- **`TaskDetailsPanel.tsx`** (nuevo): lista todas las tareas del
  expediente actual (viene de `project.tasks`, así que solo las que
  siguen existiendo y son de ese expediente). Cada una es una tarjeta
  desglosable; al abrirla muestra ID, nombre, responsable, y la lista de
  materiales — por cada uno: categoría, nombre, cantidad y los valores
  propios de su métrica (p. ej. «Peso (kg): 120, Longitud (m): 5») — y el
  total de materiales de la tarea.
- **`ProjectDetailView.tsx`**: nueva pestaña «Tareas» entre «Cronograma
  Gantt» e «Historial», con el mismo contador de tareas que el Gantt.
- **`ActiveView`** (tipo compartido) y el breadcrumb de `AppShell.tsx`
  ganan el valor `"tasks"`.
- **`GuideView.tsx`**: actualizado el paso de «Nueva tarea» (ya no pide
  responsable) y se agregó un paso sobre la pestaña «Tareas».

## Validación

- `npm run build`, `npm test` (10): correctos (sin cambios de backend en
  este parche, solo se dejó de mandar `ownerName`/`dependency` desde
  algunos flujos del formulario).
- Frontend: `npx tsc --noEmit`, `npx eslint . --quiet`, `npx next build`:
  correctos.
- Verificado en el navegador con datos reales del expediente «La molina»:
  - Al crear una tarea, «Responsable: Administrador (quien crea la
    tarea)» aparece sin campo editable; guardada, la tarea queda con
    Enzo/Administrador según quién la creó.
  - «Depende de» ya no aparece en el formulario ni en la fila del Gantt.
  - La pestaña «Tareas» aparece entre Cronograma Gantt e Historial, lista
    las tareas del expediente, y al desplegar una muestra ID, nombre,
    responsable, materiales (o «Sin materiales.») y el total.
  - La tarea de prueba se eliminó al terminar.
