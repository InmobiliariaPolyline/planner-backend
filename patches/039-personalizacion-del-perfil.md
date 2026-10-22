# Parche 039: Personalización de los datos del usuario

## Qué cambia

Sistema → Perfil deja de ser solo lectura. Cada persona puede personalizar:

- **Nombre para mostrar** (el usuario de acceso y el rol no cambian).
- **Foto de perfil:** se recorta en cuadrado y se reduce a 128 px en el navegador
  (unos 3-15 KB), así que no hace falta ningún servicio de archivos.
- **Color del avatar** (8 colores) para cuando no hay foto.
- **Cargo** y **teléfono** (opcionales).

La foto/color aparecen en la barra superior, el menú de usuario y el módulo
Usuarios del Administrador, que además muestra cargo y teléfono.

## Backend

- `prisma/schema.prisma` + migración `20261022000000_add_user_profile`: 4 columnas
  opcionales en `User` (`avatarUrl`, `avatarColor`, `jobTitle`, `phone`).
- `src/lib/profile.ts`: validación (`parseProfile`): nombre 2-80, cargo ≤ 80,
  teléfono con formato válido, color hexadecimal, foto solo `data:image/png|jpeg|webp`
  de hasta 60 000 caracteres; sin `<` ni `>`.
- `PATCH /auth/profile` guarda los cambios y devuelve un **token nuevo** (el nombre
  viaja dentro del token). `GET /auth/me` ahora lee de la base para devolver el
  perfil. `GET /users` (Administrador) incluye los datos del perfil.
- El token **no** lleva la foto, solo la identidad.
- 5 pruebas unitarias nuevas (`test/profile.test.ts`): 16 en total.

## ⚠️ Orden de despliegue (importante)

Este parche **cambia el schema**. Prisma pide todas las columnas del modelo al
iniciar sesión, así que si el backend nuevo arranca antes de la migración, **el
login falla**. Aplica primero la migración:

```
npx prisma migrate deploy
```

y solo después despliega (merge a `main` / redeploy de Render). Si el comando
de build de Render es `npm run render-build`, la migración corre sola antes de
arrancar la app.

## Validación

`tsc` (backend y frontend), `eslint`, `next build` y 16 pruebas unitarias sin
errores. En el navegador: el formulario se muestra, una imagen de 1200×800 se
reduce a un JPEG de 128×128 de 2,7 KB y el botón «Guardar perfil» se habilita al
cambiar algo. El guardado contra la API no se probó porque la base de producción
aún no tiene las columnas nuevas.
