# Parche 013: crear usuarios desde el panel de Administrador

## Qué cambia

Hasta ahora las cuentas solo se podían crear con el script
`npm run seed:users` desde la terminal. El Administrador ya puede crear
cuentas nuevas directamente desde el módulo **Usuarios**, con un rol adicional:
**Civil** (además de Arquitecto).

## Flujo

Botón «Nuevo usuario» en Usuarios → formulario en dos pasos:

1. **Datos personales**: nombre, apellido y rol (Arquitecto o Civil, en un
   desplegable). Se muestra en vivo el usuario de acceso que va a quedar
   (se deriva del nombre, ver abajo).
2. **Contraseña**: contraseña + confirmación.

Al terminar, se muestra una pantalla con el usuario y la contraseña para
copiar y entregar a la persona — igual que `seed-users.ts`, no se vuelven a
mostrar después.

## Backend

- **`src/lib/auth.ts`**: nuevo rol `'civil'` (`Role`, `ROLE_LABEL`);
  `CREATABLE_ROLES` (los roles que el Administrador puede asignar: Arquitecto
  y Civil, no Administrador); `slugifyUsername()` — convierte el nombre en un
  usuario de acceso válido (sin tildes, minúsculas, sin espacios).
- **`POST /users`** (solo Administrador): recibe `firstName`, `lastName`,
  `role`, `password`. El usuario de acceso es `slugifyUsername(firstName)`;
  si ya existe, responde 409 pidiendo otro nombre. El nombre completo
  guardado (`name`) es `firstName + ' ' + lastName`. No hay validación de
  complejidad de contraseña más allá de que no esté vacía (mismo criterio que
  `seed-users.ts`).
- No hizo falta migración: `User.role` ya era texto libre, no un enum de base
  de datos.

## Frontend

- **`components/planner/CreateUserModal.tsx`** (nuevo): el formulario de dos
  pasos descrito arriba.
- **`components/planner/UsersView.tsx`**: botón «Nuevo usuario»; al crear una
  cuenta se añade a la lista al instante, sin recargar.
- **`lib/api.ts`**: `api.createUser()`.

## Validación

- `npm run build`, `npm test` (8), `npx prisma validate`: correctos.
- Frontend: `npx tsc --noEmit`, `npx eslint . --quiet`, `npx next build`:
  correctos.
- Verificado en el navegador contra la base de datos real: creé una cuenta de
  prueba («Marcos Lopez», rol Civil) con el flujo completo de dos pasos,
  confirmé que el usuario de acceso mostrado (`marcos`) coincidía con el
  creado, que apareció de inmediato en la lista, y que podía abrirse su panel
  como cualquier otro usuario. La cuenta de prueba se eliminó directamente de
  la base de datos al terminar (no hay endpoint para borrar usuarios desde la
  interfaz todavía).

## Pendiente / posibles mejoras futuras

- No hay forma de eliminar ni editar una cuenta desde la interfaz (hay que
  usar Prisma directamente).
- Si el nombre de pila ya está en uso como usuario, hay que cambiar el
  nombre para poder crear la cuenta (no se ofrece un sufijo automático como
  `nombre2`).
