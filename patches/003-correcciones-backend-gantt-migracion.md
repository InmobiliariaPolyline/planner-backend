# Parche 003: correcciones de backend, Gantt y migración base

Bloque de correcciones de bajo riesgo. Ningún cambio toca variables de entorno
de Render, Vercel o Neon. La API mantiene el mismo contrato (mismas rutas y
cuerpos); solo cambian las respuestas de error y detalles internos.

## Backend (`src/`)

- `app.set('trust proxy', 1)`: Render sirve la API detrás de un proxy. Sin esto,
  `express-rate-limit` usaba la IP del proxy para todos y el cupo de 300 req/15 min
  se compartía entre todos los usuarios (429 generalizado) además de emitir un
  error de validación en los logs.
- CORS de origen no permitido: ahora responde sin cabeceras CORS
  (`callback(null, false)`) en vez de `throw`, que provocaba un 500 con stack.
- Manejador de errores final + 404 en JSON: las rutas inexistentes y los errores
  internos devuelven `{ "error": ... }` en vez de HTML.
- `GET /health`: endpoint ligero para monitoreo (el health check de Render puede
  seguir siendo `GET /`).
- `PATCH /tasks/:id`: usa `cleanText` / `requiredDate` como el resto de rutas y
  responde 400 ante datos inválidos (antes: `name` sin validar y 500).
- `POST /projects/:projectId/milestones`: responde 400 ante error de validación
  (antes: 500).
- Pool de PostgreSQL: `max: 5` y cierre ordenado en `SIGTERM`/`SIGINT` para no
  acumular conexiones en cada redeploy de Render.

## Dependencias del backend (`package.json`)

- `typescript`: `^7.0.2` (compilador nativo en beta) → `~5.9.2` (estable).
- `@types/node`: `^26` → `^20` (coincide con `engines` y el runtime de Render).
- Se elimina `ts-node` (no se usaba; `npm run dev` usa `tsx`).

Validación: `npm run build` (`prisma generate` + `tsc`) correcto.

## Migración base de Prisma (`prisma/migrations/`)

`20260822221847_init/migration.sql` era todavía el andamio inicial (un `Project`
con `id` serial y un `Task` con `title`/`completed`) y no describía el esquema
real. Cualquier `prisma migrate deploy` sobre una base limpia creaba un esquema
que la API no puede usar.

Se regeneró el archivo desde el esquema actual con:

```
npx prisma migrate diff --from-empty --to-schema ./prisma/schema.prisma --script
```

Ahora crea las 9 tablas reales (`Project`, `Task`, `Milestone`,
`PerformanceMetric`, `DriveLink`, `TeamMember`, `TeamStatus`, `TechnicalArea`) con
sus claves foráneas.

### Acción única sobre la base existente de Neon

La base de Neon ya tiene la estructura correcta (se creó con `db push`). Para que
Prisma la reconozca como "migración ya aplicada" sin volver a ejecutar el SQL,
correr **una sola vez**, en un entorno con `DATABASE_URL` de Neon:

```
npx prisma migrate resolve --applied 20260822221847_init
```

- Render **no** ejecuta `migrate deploy` en el build (sigue siendo
  `prisma generate && tsc`), así que ningún deploy toca la base por sí solo.
- Sobre una base nueva y vacía, `npx prisma migrate deploy` ahora sí crea el
  esquema correcto.

## Frontend (`frontend/`)

- `app/page.tsx` — Gantt: las barras se calculaban con un timeline fijo de junio
  2026 y un mapeo de meses (`{ Jun: 5 }`) que nunca coincidía con la salida en
  minúscula de `toLocaleDateString`, así que quedaban en `NaN`. Ahora se calcula
  sobre el rango real de fechas de las tareas (ISO) y las 4 columnas de la
  cabecera se derivan de ese rango.
- `app/page.tsx` — `updateProgress`: si el `PATCH` falla, revierte el progreso al
  valor anterior (antes quedaba en pantalla un valor no guardado).
- `lib/neon.ts` eliminado: código muerto que hacía `throw` al importarse y
  arrastraba `@neondatabase/neon-js` (`0.7.0-beta`). No lo usaba nadie.
- `app/globals.css`: `@import "./globals-extensions.css"` movido al inicio del
  archivo (la regla `@import` debe preceder a cualquier otra regla CSS).

Validación: `npm run build` dentro de `frontend` correcto.
