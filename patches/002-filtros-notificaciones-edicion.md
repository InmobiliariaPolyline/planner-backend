# Parche 002: filtros, notificaciones y edicion

## Cambios aplicados

- Los filtros de estado y orden ahora son listas desplegables (`select`).
- El filtro de estado ofrece Todos, En ejecucion y Completados.
- El orden ofrece Mas recientes, Nombre y Progreso.
- La campana abre un panel de actividad y permite limpiar sus eventos.
- Se registran cargas de proyectos, creaciones, ediciones, eliminaciones,
  participantes e hitos.
- Se agrego Editar expediente en el detalle.
- La edicion usa `PATCH /projects/:id` y confirma que se guarda en la base de datos.

## Archivos modificados

- `frontend/app/page.tsx`
- `frontend/app/globals.css`

## Validacion

- `npm run lint` dentro de `frontend`: correcto.
- `npm run build` dentro de `frontend`: correcto.

## Pendientes

- Crear tareas desde la interfaz con `POST /projects/:projectId/tasks`.
- Guardar el progreso del Gantt con `PATCH /tasks/:id`.
- Registrar en notificaciones las modificaciones de tareas cuando se conecten.