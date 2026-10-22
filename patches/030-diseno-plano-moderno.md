# Parche 030: Diseño plano moderno (reemplaza a los parches 028 y 029)

## Qué se pidió

Un rediseño moderno pero sin aspecto 3D.

## Criterio

Estilo plano y editorial: colores sólidos, bordes finos de 1 px, **sin
sombras, sin vidrio, sin brillos, sin degradados y sin elevación al pasar el
cursor**. La jerarquía la dan la tipografía, el espacio y el acento.

## Qué cambia (solo `globals.css`, sección 10)

- Titulares grandes y firmes (hasta 3 rem), etiquetas en mayúsculas pequeñas.
- Paleta neutra casi blanca / casi negra con acento violeta sólido.
- Botones sólidos; tarjetas, paneles, modales y menús solo con borde.
- Tarjetas de cifras con un filete de color superior (violeta, verde, ámbar).
- Navegación activa en bloque sólido de alto contraste; pestañas con subrayado.
- Pantalla de carga y login sin luces ni cuadrícula: fondo liso.
- Al pasar el cursor solo cambia el borde, nunca la posición.
- Se conserva el dock de navegación inferior en móvil.

## Validación

`npx tsc --noEmit` y `npx next build` sin errores. Verificado en navegador en
claro y oscuro (Dashboard y Configuración). No requiere migración.
