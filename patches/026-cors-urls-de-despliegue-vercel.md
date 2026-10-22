# Parche 026: CORS para las URLs de despliegue de Vercel

## Problema

Entrar al sistema desde una URL de despliegue de Vercel (por ejemplo
`plannerbackend-6d75fspuw-polyline.vercel.app`) mostraba «No fue posible
conectar con la API» aunque el backend estaba activo. La lista de orígenes
permitidos solo incluía `localhost:3000` y `plannerbackend.vercel.app`, así que
el navegador bloqueaba la respuesta por falta de cabeceras CORS.

## Cambio

`src/index.ts`: además de `FRONTEND_ORIGIN`, se aceptan los orígenes que
cumplen `https://plannerbackend[-...]-polyline.vercel.app` (despliegues y
ramas del mismo proyecto y equipo de Vercel). Cualquier otro origen sigue
bloqueado.

## Validación

`npx tsc --noEmit` y las 11 pruebas unitarias pasan. Requiere que Render
redespliegue el backend para tener efecto. No requiere migración.
