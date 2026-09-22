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
- `008-guia-notificaciones-validacion.md`: módulo «Guía de uso» (manual paso a
  paso con figuras), «x» para descartar notificaciones sueltas, validación de
  formularios que ya no marca en rojo los campos vacíos hasta enviar, e iconos
  de navegación revisados («Catálogos» en vez de engranaje).
- `009-historial-de-expediente.md`: tabla `ActivityEvent` + pestaña «Historial»
  con la línea de tiempo de todos los sucesos del expediente (creación,
  cambios de valor con antes→después, altas y bajas). **Requiere aplicar la
  migración `20260908120000_add_activity_events` a Neon.**
- `010-import-export-retencion-avisos.md`: importar/exportar expediente e
  historial en Excel y PDF, retención del historial a 1 año + 2 semanas
  (borrado automático), y avisos flotantes verde/rojo con mensajes claros.
- `011-autenticacion-de-usuarios.md`: autenticación real con usuario y
  contraseña (JWT), dos cuentas — Administrador y Arquitecto —, y el
  historial ahora registra al usuario autenticado en vez de un valor fijo.
  **Requiere `JWT_SECRET`, aplicar la migración `20260917000000_add_users` y
  correr `npm run seed:users`.**
- `012-visibilidad-por-usuario-y-panel-de-administracion.md`: un Arquitecto
  ya solo ve los expedientes que creó o donde está vinculado como
  participante; el Administrador sigue viendo todo y tiene un módulo nuevo,
  «Usuarios», con estado en línea/desconectado en vivo (WebSocket) y un panel
  por cuenta. **Requiere aplicar la migración
  `20260917010000_add_project_owner_and_member_user`.**
- `013-crear-usuarios-desde-el-panel.md`: el Administrador ya puede crear
  cuentas nuevas (Arquitecto o Civil) desde el módulo Usuarios, en dos pasos
  (datos personales y contraseña), sin usar la terminal. No requiere
  migración nueva.
- `014-progreso-automatico-por-fechas.md`: el % de avance de una tarea se
  calcula solo según cuánto pasó entre su fecha de inicio y término; solo
  quien creó el expediente (o el Administrador) puede fijarlo a mano, con
  aviso antes de desactivar el modo automático e indicador verde/rojo.
  **Requiere aplicar la migración `20260917020000_add_task_auto_progress`.**
- `015-tema-morado-configuracion-y-logo.md`: acento morado en modo oscuro,
  módulo «Configuración» (engranaje) con selector de tema, y logotipo
  opcional por expediente (150×150 a 250×250 px). **Requiere aplicar la
  migración `20260922000000_add_project_logo`.**
- `016-cambio-de-contrasena-y-2fa-en-pausa.md`: cambio de la propia
  contraseña desde Configuración → Perfil (sin pasos extra). La verificación
  en dos pasos por correo (Resend) queda construida pero **en pausa**: el
  plan gratuito de Resend solo envía a la cuenta con la que se creó, así que
  no sirve todavía para usuarios reales. **Requiere aplicar la migración
  `20260922010000_add_two_factor_auth`.**
- `017-materiales-por-tarea.md`: al crear o editar una tarea se puede elegir
  uno o varios materiales de un catálogo de 501 materiales (27 categorías),
  indicando la cantidad de cada uno; cada material conserva su propia
  densidad y métrica aunque comparta categoría con otro. Reemplaza la
  función de «métricas de rendimiento» de las tareas. **Requiere aplicar la
  migración `20260922020000_add_materials` y correr
  `npm run seed:materials`.**
- `018-valores-numericos-por-material.md`: al elegir un material, en vez de
  un campo único «Cantidad» aparece un campo numérico por cada valor que
  pide su métrica (p. ej. «Peso (kg)» y «Longitud (m)» por separado).
  **Requiere aplicar la migración `20260922030000_add_material_values`**
  (borra los valores de materiales ya agregados con el parche 017, si los
  hubiera).
- `019-cantidad-de-material-de-vuelta.md`: el parche 018 había quitado por
  error el campo «Cantidad»; vuelve a estar junto a los campos de la
  métrica (cantidad **y** valores de la métrica, no uno u otro). **Requiere
  aplicar la migración `20260922040000_add_material_quantity_back`.**
- `020-responsable-automatico-y-pestana-tareas.md`: quien crea una tarea
  queda como responsable automáticamente (ya no se escribe a mano); se
  quita el campo «Depende de»; y se agrega una pestaña «Tareas» entre
  «Cronograma Gantt» e «Historial» con el listado desglosable de las
  tareas del expediente (ID, responsable, materiales con categoría,
  cantidad y valores de su métrica). No requiere migración.

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

La autenticación real ya está implementada (ver `011-autenticacion-de-usuarios.md`),
pero falta que el operador configure `JWT_SECRET` en Render, aplique la
migración `20260917000000_add_users` y corra `npm run seed:users` contra Neon.