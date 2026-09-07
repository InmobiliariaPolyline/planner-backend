# Parches del proyecto

Esta carpeta documenta correcciones pequenas y verificables del proyecto.

Los parches se aplican directamente al codigo mediante cambios versionados. Esta
carpeta no es leida automaticamente por Render ni por Vercel.

## Regla para cada parche

1. Explicar el problema y el alcance.
2. Aplicar el cambio minimo.
3. Ejecutar la validacion indicada.
4. Registrar pendientes y riesgos conocidos.

## Parches registrados

- `001-persistencia-api.md`: elimina el fallback de proyectos en `localStorage`.
- `002-filtros-notificaciones-edicion.md`: filtros desplegables, panel de
  actividad y edicion de expedientes.
- `003-correcciones-backend-gantt-migracion.md`: `trust proxy`, manejador de
  errores JSON, `/health`, validacion de `PATCH /tasks`, pool acotado y cierre
  ordenado; regeneracion de la migracion base; correccion del Gantt y del
  rollback de progreso; se elimina `lib/neon.ts`; se baja TypeScript 7 -> 5.9.
- `005-responsive-sidebar.md`: la barra lateral ya no se desordena en anchos
  intermedios (~700-1080 px); colapsa a solo iconos y no desborda.
- `006-correcciones-generales.md`: lote grande — progreso/duración del proyecto
  derivados, validación de fechas en el backend, fin de los window.prompt
  (modales reales), editar/eliminar tareas/participantes/hitos, métricas y
  Drive con UI, debounce del slider, reintentos ante arranque en frío, CI,
  pruebas unitarias.
- `007-rediseno-interfaz-configuracion.md`: refinamiento del sistema de diseño
  (tokens, elevación, modo oscuro, modales con cabecera/cuerpo, marcadores del
  Gantt) y vista nueva de "Configuración" para crear y eliminar áreas técnicas
  y estados de equipo. La pantalla de acceso no se toca.

## Cambios mayores (no son parches)

- Rediseño completo de la interfaz del frontend + reorganización de `app/page.tsx`
  en `components/`, `hooks/` y `lib/`. Detalle en `frontend/DESIGN.md`. La lógica
  de interacción (prompts, confirmaciones) no cambió.
- Enlaces públicos de expedientes: tabla `ShareLink` en Prisma
  (migración `20260906120000_add_share_links`), endpoints `/share-links` y
  `/shared/:token`, ruta pública `frontend/app/s/[token]` y pantalla
  "expediente no disponible". Requiere `npx prisma migrate deploy` (o
  `db push`) una vez sobre la base de Neon. Detalle en `frontend/DESIGN.md`
  y la GUIA.

## Fuera de alcance por ahora

No se modifica la cadena de dependencias que `npm audit` reporto con tres
vulnerabilidades altas. La correccion automatica propone bajar Prisma 7 a Prisma
6, por lo que se esperara una actualizacion compatible antes de actuar.

Sigue pendiente la autenticacion real: la pantalla de acceso y la API no validan
identidad todavia.