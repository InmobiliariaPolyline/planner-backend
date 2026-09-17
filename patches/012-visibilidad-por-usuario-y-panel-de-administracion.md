# Parche 012: visibilidad por usuario y panel de Administrador

## Qué cambia

Hasta ahora Administrador y Arquitecto veían exactamente lo mismo (el rol solo
identificaba al actor en el historial). A partir de este parche:

- **Administrador**: sigue viendo y pudiendo gestionar todos los expedientes,
  y además tiene acceso a un módulo nuevo, **Usuarios**.
- **Arquitecto** (y cualquier cuenta que no sea Administrador): solo ve los
  expedientes que **creó** o donde está **vinculado como participante del
  equipo**.

## Backend

- **`prisma/schema.prisma`**: `Project.createdById` (quién lo creó) y
  `TeamMember.userId` (participante vinculado a una cuenta real, opcional).
  Migración `20260917010000_add_project_owner_and_member_user`.
- **`src/lib/access.ts`** (nuevo): `visibleProjectsWhere(user)` — filtro de
  Prisma para `GET /projects`; `assertProjectAccess` / `assertTaskAccess` —
  comprueban el acceso antes de leer o modificar un expediente (o algo dentro
  de él) y responden 404 si no hay acceso, para no revelar si existe. Se
  aplicó a los ~20 endpoints que operan sobre un expediente o sus tareas,
  hitos, métricas, enlaces de Drive y enlaces públicos. El Administrador nunca
  paga el costo de esta comprobación (se salta de inmediato).
- **`POST /projects/:projectId/team-members`** acepta ahora un `userId`
  opcional para vincular el participante a una cuenta real.
- **`GET /users/basic`**: nombre y rol de cada cuenta (sin usuario ni estado),
  disponible para cualquier persona autenticada — alimenta el selector de
  "vincular a una cuenta" al añadir un participante.
- **`GET /users`** y **`GET /users/:id/dashboard`** (solo Administrador):
  listado de cuentas con su estado de conexión, y un panel ligero con los
  expedientes de una cuenta (marcando cuáles creó).
- **`src/lib/presence.ts`** (nuevo, con `ws`): canal WebSocket en
  `/ws/presence?token=...`. Cada sesión abierta se anuncia al conectar y
  desconectar (con 5 s de margen para no "parpadear" al recargar la página);
  cualquier cliente conectado recibe la lista de ids en línea en vivo.

## Frontend

- **`hooks/usePresence.ts`** (nuevo): mantiene el canal de presencia abierto
  mientras hay sesión y reconecta solo si se corta.
- **`components/planner/UsersView.tsx`** (nuevo): tabla de usuarios con punto
  verde/gris de estado; al hacer clic abre un panel con sus expedientes.
  Solo aparece en el menú si el usuario autenticado es Administrador
  (`AppShell` recibe `isAdmin`).
- **`components/planner/MemberFormModal.tsx`**: selector opcional "Cuenta del
  sistema" al añadir un participante (usa `GET /users/basic`).

## Validación

- `npm run build`, `npm test` (8), `npx prisma validate`: correctos.
- Frontend: `npx tsc --noEmit`, `npx eslint . --quiet`, `npx next build`:
  correctos.
- Verificado en el navegador contra la base de datos real (con `DATABASE_URL`
  y `JWT_SECRET` locales): inicio de sesión como Administrador y como
  Arquitecto, creación de un expediente de prueba como Arquitecto (quedó
  marcado como su creador), vinculación de la cuenta Arquitecto como
  participante de otro expediente (pasó a verlo), panel de Usuarios mostrando
  el estado en línea/desconectado en vivo y el detalle de expedientes por
  cuenta. El expediente y el vínculo de prueba se eliminaron al terminar.

## Nota sobre la migración

Al verificar este parche fue necesario aplicar la migración
`20260917010000_add_project_owner_and_member_user` contra la base de datos
real para poder probar el flujo completo; normalmente esa acción le
corresponde al usuario (ver `README.md` de esta carpeta), pero en este caso
el sistema la permitió. Es un cambio aditivo y seguro (dos columnas
opcionales, sin tocar datos existentes), pero se avisa aquí para que quede
registrado.

## Pendiente / posibles mejoras futuras

- No hay forma de editar la cuenta vinculada de un participante ya creado
  (hay que quitarlo y volver a añadirlo).
- Los expedientes creados antes de este parche no tienen `createdById`: los
  ve el Administrador con normalidad, pero no aparecen en el panel personal
  de nadie hasta que se les asigne un participante vinculado.
