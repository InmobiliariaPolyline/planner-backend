# Parche 009: historial de sucesos del expediente

Cada expediente registra ahora todo lo que le pasa —creación, ediciones de
valores, altas y bajas— y lo muestra en una pestaña «Historial».

## Base de datos (requiere migración)

- Nueva tabla **`ActivityEvent`** (`prisma/schema.prisma`, migración
  `20260908120000_add_activity_events`). Se borra en cascada con el expediente.
- Campos: `actor`, `action` (código), `entity` (texto), `target` (nombre de lo
  afectado), `summary` (frase legible), `tone`
  (`neutral` / `positive` / `negative` / `warning`) y `changes` (JSON con
  `[{ field, label, from, to }]` para las ediciones).

> **Hay que aplicar la migración a Neon una vez** (`npx prisma migrate deploy`
> con la `DATABASE_URL` de Neon). Hasta entonces la pestaña «Historial» se ve,
> pero muestra un aviso y queda vacía; el registro de sucesos falla en silencio
> sin afectar a ninguna operación.

## Backend (`src/`)

- **`src/lib/activity.ts`**: `logEvent(projectId, …)` (nunca lanza) y
  `diffFields(before, after, defs)` para calcular sólo los campos que cambiaron,
  con formateadores `money` y `percent`.
- **`GET /projects/:projectId/activity`**: lista los sucesos, más reciente
  primero (máx. 200).
- Se registra un suceso tras: crear/editar expediente (el cambio de
  **presupuesto** se marca en tono `warning`), crear/editar/borrar tarea
  (incluye el cambio de **avance**), alta/baja de participante, alta/edición/baja
  de hito, alta/baja de métrica y de enlace de Drive, y generar/regenerar/
  revocar/cambiar permiso de un enlace público.
- `actor` es `"Administrador"` desde la interfaz y
  `"Colaborador (enlace)"` / `"Colaborador «etiqueta»"` cuando la acción entra
  por un enlace público de edición.
- `updateProjectFields()` y `createTaskForProject()` / `patchTask()` se comparten
  entre las rutas de administración y las de `/shared/:token`.

## Frontend (`frontend/`)

- **`components/planner/ActivityTimeline.tsx`**: línea de tiempo agrupada por día
  («Hoy», «Ayer», fecha). Cada suceso lleva un punto de color según el tono, el
  actor, el tiempo relativo (con la fecha exacta en el `title`) y, si hubo
  cambios de valor, el `antes → después` con el `antes` tachado en rojo y el
  `después` en verde (o ámbar para el dinero).
- Nueva pestaña **«Historial»** en el detalle del expediente; `ActiveView`
  incluye `"activity"`.
- `lib/api.ts` → `listActivity`; `lib/format.ts` → `dateTime`.
- Estilos nuevos en `globals.css` con el **mismo lenguaje visual que la guía**
  (encabezado con epígrafe, puntos, tarjetas suaves, tonos semánticos).

## Validación

- `npm run build`, `npm test`, `npx tsc`, `npx eslint`, `npx next build`:
  correctos.
- Pendiente de probar contra Neon con la migración aplicada (localmente la API
  en producción todavía no tiene la tabla; la interfaz degrada con aviso).
