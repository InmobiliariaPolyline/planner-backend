# Parche 001: persistencia mediante API

## Problema

Cuando Render o la API fallaban, el frontend creaba proyectos con identificadores
`LOCAL-...` y los guardaba en `localStorage`. Eso podia hacer creer que los datos
habian llegado a Neon aunque nunca hubieran salido del navegador.

## Correccion aplicada

- El listado muestra un error y queda vacio si `GET /projects` falla.
- La creacion propaga el error de `POST /projects`; ya no crea proyectos locales.
- La eliminacion ya no escribe una copia de proyectos en `localStorage`.
- `localStorage` conserva unicamente el tema claro/oscuro.

Archivo corregido: `frontend/app/page.tsx`

## Validacion

- `npm run lint` dentro de `frontend`: correcto.
- `npm run build` dentro de `frontend`: correcto.

## Pendientes relacionados

- Conectar la creacion de tareas con `POST /projects/:projectId/tasks`.
- Persistir el progreso con `PATCH /tasks/:id`.
- Cargar las tareas de `selectedProject.tasks` en el Gantt.
- Agregar autenticacion antes de manejar datos reales.