# Parche 006: correcciones generales del sistema

Lote de correcciones sobre el listado de conflictos detectado. Queda pendiente
solo la **autenticación con credenciales** (decisión temporal del proyecto).

## Backend (`src/`)

- **`progress` del proyecto derivado**: se recalcula como el promedio del
  progreso de las tareas tras crear / editar / borrar una tarea
  (`src/lib/projectMath.ts` · `recomputeProjectProgress`).
- **`durationMonths` derivado**: se calcula del rango de fechas en cada
  create/patch; ya no es entrada del usuario.
- **Validación `endDate >= startDate`** en proyectos y tareas
  (`assertDateOrder`).
- `GET /technical-areas` y `GET /team-statuses` con `try/catch` (500 propio).
- **`DELETE /technical-areas/:id` y `/team-statuses/:id`** (409 si están en uso).
- **Cupo de peticiones separado** para `/shared` (600/15 min, aislado del de
  administración).
- Los endpoints de gestión de enlaces ya no filtran mensajes crudos de Prisma
  (`handleShareError`).
- **Enlace de editor ampliado**: `POST /shared/:token/tasks`,
  `PATCH /shared/:token/tasks/:id` (campos completos), `DELETE`.
- Campos `Project.dependency` / `Project.isPhase` marcados `@default` en el
  schema (no se dropean para no acoplar el deploy a una migración).

## Frontend (`frontend/`)

- **Se eliminan todos los `window.prompt` / `alert` / `confirm`**. Modales
  reales: `TaskFormModal` (crear/editar tarea, con selector de área y creación
  en línea, métricas y enlaces de Drive), `MemberFormModal`,
  `MilestoneFormModal` (crear y editar), `ConfirmDialog`.
- **Editar y eliminar** tareas, participantes e hitos desde la interfaz.
- **Métricas de rendimiento y enlaces de Drive**: alta y baja desde la edición
  de la tarea.
- **Slider de progreso con debounce**: persiste al soltar / dejar de mover, no
  en cada píxel.
- **Reintentos en las lecturas** (`lib/api.ts`) para el arranque en frío de
  Render, con aviso "Conectando con el servidor…".
- **Notificaciones persistentes** (localStorage) y tiempo relativo real
  ("hace 5 min").
- **Sin parpadeo de tema**: `<script>` en `<head>` que fija `data-theme` antes
  de pintar (+ `suppressHydrationWarning`).
- Fechas de solo-día se formatean en UTC (antes se veía el día anterior en
  zonas UTC-).
- Los mensajes de error del servidor se muestran tal cual cuando son limpios.

## Operaciones

- **`scripts/copy-prisma-client.js`** ya estaba (parche 004). Nuevo script
  `render-build` = `prisma generate + migrate deploy + tsc + copiar cliente`;
  recomendado como Build Command en Render.
- **CI**: `.github/workflows/ci.yml` (build + lint + tsc + pruebas en cada push
  y PR).
- **Pruebas unitarias**: `test/validation.test.ts` (`npm test`, con `node:test`
  vía tsx).
- `prisma.config.ts` ya no lanza si falta `DATABASE_URL` (comandos offline).
- `tsconfig.json`: `target` es2022; `test/` excluido.

## Docs

- `GUIA_APIS_RENDER_NEON_VERCEL.txt`: se quita el host/usuario de Neon del texto;
  Build Command actualizado.
- Nuevo `README.md` en la raíz.

## Validación

- `npm run build`, `npm test` (8 pruebas), `npx tsc`, `npx eslint`,
  `npx next build`: correctos.
- Flujos probados contra Neon: crear proyecto (duración calculada), fechas
  invertidas → 400, crear tarea → progreso del proyecto recalculado, PATCH
  tarea → recálculo, enlace público editor, alta de participante con estado
  creado en línea, baja de participante.
