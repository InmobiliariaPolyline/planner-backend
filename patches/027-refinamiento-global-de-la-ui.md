# Parche 027: Refinamiento global de la UI

## Qué se pidió

Seguir mejorando toda la interfaz del sistema usando los elementos que ya
existen, sin omitir ningún módulo.

## Qué se hizo (solo aspecto; sin cambios de lógica ni de backend)

Una pasada por todos los módulos con las clases ya existentes
(`globals.css`, sección 9):

- **Global:** selección de texto con el color de marca, barras de
  desplazamiento acordes al tema, anillo de foco visible para teclado y
  desplazamiento suave.
- **Dashboard / Expedientes / Detalle:** línea de acento y degradado en los
  encabezados, paneles que resaltan su borde, iconos de las tarjetas que
  reaccionan, números tabulares.
- **Estados vacíos y esqueletos:** el icono flota; la carga de usuarios, del
  panel de usuario y de los enlaces públicos pasa de un texto «Cargando…» a
  esqueletos con brillo.
- **Listas, historial y Gantt:** filas con realce al pasar el cursor, punto del
  evento más reciente con pulso, línea de «hoy» y anillo de cartera con
  entrada animada.
- **Usuarios y menús:** avatares que reaccionan, menú de usuario y panel de
  notificaciones con entrada desde su esquina, insignia de notificación con
  rebote.
- **Modales y avisos:** cabecera con línea de acento, botón de cierre que gira,
  avisos con barra de tiempo.
- **Pestañas, validación, Guía de uso, Configuración, expediente público y
  pantalla «no disponible»:** subrayado animado, avisos que entran suaves,
  tarjetas y capturas que levitan, opciones de tema con marca animada.

Respeta `prefers-reduced-motion`.

## Validación

`npx tsc --noEmit`, `npx eslint . --quiet` y `npx next build` sin errores.
Verificado en el navegador (claro y oscuro): Dashboard, Guía de uso, Usuarios
y el modal de nuevo usuario. No requiere migración.
