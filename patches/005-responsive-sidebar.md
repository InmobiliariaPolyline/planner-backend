# Parche 005: barra lateral en anchos intermedios

## Problema

Al poner el navegador a media pantalla (~700–1080 px), la barra lateral se
"desordenaba": el texto de los enlaces de navegación no se ocultaba y se
desbordaba encima del contenido; además el selector que debía ocultar el texto
apuntaba al `<span>` del icono de marca en vez de al bloque de texto.

Causa:

- El texto de cada `.nav-item` era un nodo de texto suelto (`{item.label}`), no
  un `<span>`, así que `.nav-item span { display: none }` no lo alcanzaba.
- `.sidebar-brand span` ocultaba también el icono de la marca (es un `<span>`).
- `.sidebar` no tenía `overflow: hidden`, así que cualquier desbordamiento se
  veía sobre el área de contenido.

## Correccion aplicada

Archivos: `frontend/components/planner/AppShell.tsx`, `frontend/app/globals.css`

- El label del `.nav-item` se envuelve en `<span class="nav-label">` (+ `title`
  para tooltip cuando está colapsada).
- `.sidebar { overflow: hidden }` siempre.
- Nuevo breakpoint `@media (max-width: 1000px)`: barra compacta de 64 px con
  solo iconos. Se ocultan `.sidebar-brand > div`, `.sidebar-label`, `.nav-label`
  y `.sidebar-footer > div`; el icono de marca y los iconos de navegación
  permanecen y quedan centrados.
- Por debajo de 720 px la barra sigue oculta como antes.

## Validacion

- `npm run lint` y `npm run build` dentro de `frontend`: correcto.
- Revisado en el navegador a 700, 975, 1150 y ~390 px.
