# Parche 028: Rediseño visual «Aurora»

## Por qué

El parche 027 pulió el diseño existente pero la apariencia seguía igual. Este
parche cambia el lenguaje visual de todo el sistema.

## Qué cambia (solo frontend, `globals.css` sección 10)

- **Fondo en malla de color** (violeta, azul y rosa suaves) fijo tras toda la app.
- **Superficies de vidrio:** paneles, tarjetas, modales y menús translúcidos con
  desenfoque, borde luminoso y radios grandes (18–26 px).
- **Barra lateral y barra superior flotantes**, la superior en píldora.
- **Navegación activa y pestañas** con degradado violeta→azul; las pestañas
  pasan a ser un control segmentado.
- **Botones en píldora** con degradado y resplandor; iconos circulares.
- **Tarjetas de cifras estilo bento** con resplandor de color propio y números
  en degradado.
- **Campos más amplios** (44 px) con anillo de foco grueso.
- **Barras de progreso** con degradado y brillo.
- **Paleta nueva** en claro y oscuro (tokens), y títulos más grandes.
- **Móvil:** por debajo de 720 px no había ningún menú de navegación; ahora hay
  un dock flotante inferior con los iconos de los módulos.

No cambia estructura ni lógica. Respeta `prefers-reduced-motion`.

## Validación

`npx tsc --noEmit` y `npx next build` sin errores. Verificado en el navegador
en claro, oscuro y móvil (Dashboard y Catálogos). No requiere migración.
