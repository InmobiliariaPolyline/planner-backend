# Parche 029: Pulido del estilo original (reemplaza al 028)

## Por qué

El rediseño «Aurora» (parche 028) no gustó. Se retira por completo y se vuelve
al estilo sobrio de siempre (superficies sólidas, acento morado, barra lateral
fija), mejor ejecutado.

## Qué cambia (solo `globals.css`, sección 10)

- Jerarquía tipográfica más clara (títulos sin degradado, más contraste).
- Barra lateral con más aire y selección más nítida.
- Tarjetas de cifras con icono en recuadro de color (morado, verde, ámbar) y
  número protagonista.
- Paneles y tarjetas con radio de 16 px, contorno fino y sombra suave al interactuar.
- Campos de 42 px, botones con mejor acabado, pestañas con subrayado más grueso.
- Filas de listas más cómodas y modales con radio mayor.
- Se conserva el dock de navegación inferior en móvil del parche 028 (por debajo
  de 720 px no había ningún menú).

## Validación

`npx tsc --noEmit` y `npx next build` sin errores. Verificado en navegador
(escritorio y móvil). No requiere migración.
