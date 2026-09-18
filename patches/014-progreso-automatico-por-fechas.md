# Parche 014: progreso automático por fechas

## Qué cambia

El % de avance de una tarea ya no empieza siempre en 0 y depende de que
alguien lo mueva a mano. Ahora:

- **Al crear una tarea**, el avance arranca en modo **automático**: se
  calcula solo según cuánto pasó del rango entre su fecha de inicio y de
  término (ej.: una tarea de 10 días que lleva 6 días corridos marca 60%).
  Se recalcula cada vez que se abre el expediente o se toca la tarea.
- **Solo quien creó el expediente (o el Administrador)** puede ajustar ese
  avance a mano. Si lo hace, aparece un aviso: *"Este avance se calcula solo
  según las fechas. Si lo guardas, dejará de ser automático"*, y al confirmar
  el diálogo de siempre lo repite antes de guardar. A partir de ahí el avance
  queda **fijo** (modo manual) hasta que esa misma persona lo vuelva a tocar.
- Debajo del % de cada tarea hay una etiqueta con un punto **verde
  "Automático"** (late, como los indicadores de "en línea") o **rojo
  "Manual"**.
- El resto de personas con acceso al expediente (participantes vinculados
  que no lo crearon) ven el avance y la etiqueta, pero no pueden abrir el
  control para cambiarlo.

## Backend

- **`prisma/schema.prisma`**: `Task.autoProgress Boolean @default(true)`.
  Migración `20260917020000_add_task_auto_progress`. Las tareas que ya
  existían se migran como **manuales** (no se altera su % actual).
- **`src/lib/taskProgress.ts`** (nuevo): `computeAutoProgress(start, end)` —
  % por días calendario completos (UTC, igual convención que las fechas de
  las tareas), no por la hora exacta de la consulta, para que no varíe según
  a qué hora del día se mire. `syncAutoProgress(tasks)` — recalcula y guarda
  el % de las tareas automáticas de una lista ya cargada.
- Se llama a `syncAutoProgress` en `GET /projects` y `GET /projects/:id`
  (y se recalcula el promedio del expediente si algo cambió), así el avance
  mostrado siempre refleja el día en curso sin necesitar un cron.
- **`createTaskForProject`**: si no se manda un `progress` explícito (caso
  normal desde la app), la tarea nace automática con el % ya calculado.
- **`patchTask`**: un `progress` explícito en el body apaga `autoProgress`
  para siempre; si en cambio cambian las fechas y la tarea seguía en
  automático, se recalcula con el nuevo rango.
- **`src/lib/access.ts`**: `assertProgressEditAccess()` — 403 si quien pide
  cambiar el `progress` no es el Administrador ni quien creó el expediente
  (a diferencia del resto de comprobaciones de acceso, aquí sí puede ver la
  tarea, por eso 403 y no 404). Se aplica solo en `PATCH /tasks/:id` cuando el
  body trae `progress`; el resto de campos de la tarea se pueden seguir
  editando igual que antes.
- Las tareas importadas (`POST /projects/import`) siguen trayendo su avance
  tal cual, marcado como manual.

## Frontend

- **`GanttChart.tsx`**: nueva prop `canEditProgress`; si es `false`, la fila
  no se puede abrir para ajustar el progreso (el resto de acciones de la
  tarea siguen disponibles). Insignia verde/roja «Automático»/«Manual» junto
  al %. Aviso dentro del editor cuando el ajuste va a desactivar el modo
  automático.
- **`PlannerApp.tsx`**: `canEditProgress = admin || creador del expediente`;
  el diálogo de confirmación de «Guardar avance» avisa explícitamente cuando
  el cambio va a apagar el modo automático.
- Se corrigió de paso un detalle: al crear una tarea el frontend mandaba
  siempre `progress: 0`, lo que la dejaba en modo manual desde el día uno;
  ahora no manda nada y el backend decide el modo automático.

## Nota sobre el desfase de zona horaria

La línea visual de "Hoy" en el cronograma usa el día calendario **local**
de quien mira la pantalla (parche anterior). El % automático, en cambio, se
calcula con el día calendario en **UTC** del servidor, porque es un valor
que se guarda y debe verse igual para todos los que abren el expediente
(no solo para quien lo mira en ese momento). Para alguien detrás de UTC
(como Centroamérica), esto puede hacer que el % automático avance unas
horas antes de que la línea "Hoy" cruce visualmente esa fecha en su propio
reloj — es un compromiso consciente, no un error.

## Validación

- `npm run build`, `npm test` (8), `npx prisma validate`: correctos.
- Frontend: `npx tsc --noEmit`, `npx eslint . --quiet`, `npx next build`:
  correctos.
- Verificado en el navegador y con la API real: tarea nueva creada en
  automático con % correcto; ajuste manual mostró el aviso, el diálogo de
  confirmación correcto, y cambió la etiqueta a "Manual"; con la cuenta
  Arquitecto (vinculada temporalmente, no creadora del expediente) se
  confirmó `403` al intentar `PATCH .../progress` y `200` al editar otros
  campos de la misma tarea. Los datos de prueba se eliminaron al terminar.
