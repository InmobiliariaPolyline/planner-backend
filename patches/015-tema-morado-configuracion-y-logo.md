# Parche 015: tema morado, módulo Configuración y logo de expediente

Primera parte de un pedido de 4 mejoras; la doble autenticación por correo
(Gmail + Resend) queda para un parche aparte una vez que el sistema tenga
listo el envío de correo.

## Modo oscuro: morado en vez de azul

El acento del modo oscuro (`#7873f0`) leía azulado en pantalla. Se cambió a
un morado más claro (`--accent: #8b5cf6`, con su hover, fondo sutil y texto
a juego). El modo claro no se tocó.

## Módulo «Configuración»

Nuevo ítem en el menú lateral (ícono de engranaje) con su primera sección,
**Tema**: tarjetas «Claro» / «Oscuro» con vista previa de color, que aplican
el cambio al instante (mismo `useTheme` de siempre, solo que ahora también
se puede elegir un tema explícito y no solo alternar). Pensado para que la
próxima sección, **Seguridad** (doble autenticación), se agregue ahí mismo
más adelante.

- `hooks/useTheme.ts`: ahora expone `setTheme` además de `toggleTheme`.
- `components/planner/ConfigView.tsx` (nuevo).

## Logotipo del expediente

Cada expediente puede tener un logotipo opcional, editable en cualquier
momento, de **150×150 a 250×250 px**. Se sube desde un marco junto al
nombre del expediente (círculo punteado con «+»; una vez puesto, aparece la
imagen y un botón «Quitar»). También se muestra como miniatura en la tarjeta
del expediente dentro de «Mis expedientes».

- **Backend**: `Project.logoUrl` (texto, guarda la imagen como *data URI* en
  base64 — no hay almacenamiento de archivos en este proyecto, y al tamaño
  máximo permitido el texto en base64 no pasa de ~350 KB). Migración
  `20260922000000_add_project_logo`. Endpoint `PUT /projects/:id/logo`,
  valida que sea una imagen (PNG/JPG/WEBP/GIF) y un peso razonable; **no**
  valida el ancho/alto en píxeles del lado del servidor (necesitaría una
  librería nueva de imágenes) — esa validación exacta (150×150 a 250×250) se
  hace en el navegador antes de subir. Cupo de JSON más grande
  (`2mb`, solo para esta ruta) porque el resto de la API espera textos
  cortos (`10kb`).
- **Frontend**: `components/planner/ProjectLogoUpload.tsx` (nuevo) — lee la
  imagen con `FileReader`/`Image` para medir el ancho y alto exactos antes
  de subir, y muestra el error en el sitio si no cumple la medida o pesa
  demasiado (~1.5 MB).

## Validación

- `npm run build`, `npm test` (8), `npx prisma validate`: correctos.
- Frontend: `npx tsc --noEmit`, `npx eslint . --quiet`, `npx next build`:
  correctos.
- Verificado en el navegador contra la base de datos real: cambio de tema
  Claro ↔ Oscuro desde Configuración; subida de un logotipo de 200×200
  (aceptado), intento con uno de 50×50 (rechazado con el mensaje exacto de
  medida, sin tocar el logo ya guardado), y «Quitar» (vuelve al marco
  vacío). El expediente de prueba quedó sin logotipo al terminar.

## Pendiente

- Doble autenticación (Gmail + Resend): se construye en el próximo parche.
- No hay un recorte/encuadre dentro de la app: si la imagen no mide entre
  150×150 y 250×250 px exactos, hay que redimensionarla fuera antes de
  subirla.
