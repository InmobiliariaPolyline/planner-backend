# Parche 011: autenticación real (Administrador y Arquitecto)

## Qué cambia

La pantalla de acceso dejó de ser un botón de demostración. Ahora hacen falta
usuario y contraseña reales, y hay dos cuentas: **Administrador** y
**Arquitecto** (mismo acceso por ahora; el rol solo identifica quién hizo qué
en el historial).

## Backend

- **`prisma/schema.prisma`**: modelo `User` (`username` único, `passwordHash`,
  `name`, `role`). Migración nueva: `20260917000000_add_users`.
- **`src/lib/auth.ts`** (nuevo): hash de contraseñas (`bcryptjs`), JWT de 12 h
  (`jsonwebtoken`, requiere `JWT_SECRET`), y `requireAuth` — middleware global
  que exige sesión válida en todo salvo `/`, `/health`, `POST /auth/login` y
  los enlaces públicos `/shared/...` (que ya tienen su propio control de
  acceso por token).
- **`POST /auth/login`** y **`GET /auth/me`** en `src/index.ts`, con un cupo de
  intentos aparte (20 cada 15 min) para dificultar la fuerza bruta.
- **`src/lib/activity.ts`**: el historial ahora registra automáticamente al
  usuario autenticado de la petición en curso (vía `AsyncLocalStorage`), sin
  tener que tocar cada endpoint uno por uno.
- **`scripts/seed-users.ts`** (`npm run seed:users`): crea las cuentas
  `admin`/Administrador y `arquitecto`/Arquitecto si no existen todavía. Por
  defecto genera una contraseña aleatoria; si quien lo ejecuta prefiere elegir
  la contraseña de antemano puede pasar `ADMIN_PASSWORD=...` /
  `ARCHITECT_PASSWORD=...` (mínimo 8 caracteres). En ambos casos se imprime
  **una sola vez** en la consola de quien lo ejecuta — no se guarda en ningún
  archivo ni se sube al repositorio.

## Frontend

- **`lib/api.ts`**: adjunta `Authorization: Bearer <token>` a cada petición;
  `api.login()` / `api.me()`; aviso (`onUnauthorized`) si el token caduca.
- **`hooks/useAuth.ts`** (nuevo): guarda el token en `localStorage`
  (`project-planner-token`), valida la sesión al cargar la página con
  `GET /auth/me`, y expone `login`/`logout`.
- **`components/planner/Screens.tsx`**: `LoginScreen` ahora es un formulario
  real (usuario + contraseña), con error visible si falla y botón deshabilitado
  mientras se procesa.
- **`components/planner/AppShell.tsx`**: ya no usa un usuario fijo; muestra el
  nombre y rol de quien inició sesión de verdad.

## Pendiente antes de que funcione en producción

1. Añadir `JWT_SECRET` a las variables de entorno de Render (y a `.env` en
   local) — cualquier cadena larga y aleatoria sirve, por ejemplo generada con
   `openssl rand -base64 48`.
2. Aplicar la migración `20260917000000_add_users` a Neon (automático si el
   *Build Command* de Render es `npm run render-build`; si no, correr
   `npx prisma migrate deploy` a mano).
3. Ejecutar `npm run seed:users` contra esa misma base para crear las dos
   cuentas y anotar las contraseñas que se muestran (no se vuelven a mostrar).

## Validación

- `npm run build`, `npm test` (8), `npx prisma validate`: correctos.
- Frontend: `npx tsc --noEmit`, `npx eslint . --quiet`, `npx next build`:
  correctos.
- `npm audit` antes/después: `bcryptjs` y `jsonwebtoken` no añaden
  vulnerabilidades nuevas.
- No se pudo verificar el flujo de login en el navegador contra el backend
  desplegado porque requiere los tres pasos pendientes arriba (secreto,
  migración y siembra), que le corresponden al operador de la base de datos.
