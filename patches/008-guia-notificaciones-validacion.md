# Parche 008: guía de uso, notificaciones y validación menos intrusiva

## Validación de formularios menos intrusiva

- El borde rojo y el aviso bajo el campo (`ValidatedField`) **ya no aparecen** al
  entrar y salir de un campo vacío ni al dejarlo a medias. Solo aparecen si:
  (a) se intenta enviar el formulario, o (b) el usuario escribió algo, lo dejó
  inválido y salió del campo.
- La ventana de ayuda al enfocar marca **en rojo, en tiempo real**, los
  requisitos que aún no se cumplen en cuanto el usuario empieza a escribir
  (antes solo los marcaba en gris). Ejemplo y lista de requisitos como antes.
- `SelectOrCreate`: el desplegable obligatorio solo se marca en rojo tras
  intentar enviar (abrir y cerrar sin elegir ya no lo marca).

## Notificaciones

- Cada notificación tiene ahora una **«x»** para descartarla individualmente
  (`useNotifications().dismiss(id)`); el botón general pasa a llamarse
  «Limpiar todo» y se oculta cuando la bandeja está vacía.
- Id de notificación con secuencia interna para no colisionar si se disparan dos
  avisos en el mismo milisegundo.
- La bandeja sigue persistida en `localStorage`: si se limpia, queda limpia
  también en la siguiente sesión (comportamiento esperado).

## Módulo «Guía de uso»

- Nuevo apartado en la barra lateral: `components/planner/GuideView.tsx`.
- Manual paso a paso con índice navegable y 10 apartados (primeros pasos, crear
  expediente, equipo, hitos, cronograma, avance, métricas/enlaces, catálogos,
  compartir, notificaciones y tema). Cada apartado tiene pasos numerados, el
  resultado esperado y una figura de referencia dibujada con el propio sistema
  visual (formulario, anatomía del Gantt en SVG, control de progreso, enlace
  compartido, catálogo en uso).
- `ActiveView` incluye `"guide"`.

### Rediseño de la guía (posterior)

El primer diseño mezclaba visualmente la figura del progreso con la leyenda del
Gantt («en curso», «hoy»…). Se rehízo:

- Cada apartado: cabecera con número, icono y separador; los pasos son una lista
  numerada y el resultado esperado va en una píldora verde aparte.
- En pantallas anchas (> 1080 px) los pasos y la figura van en dos columnas.
- Las figuras son tarjetas tipo «captura» (barra de puntos + cuerpo + pie).
- La figura del Gantt: filas con nombre + barra, marca de «hoy» con etiqueta
  arriba y **leyenda en una fila propia** debajo (ya no hay texto suelto
  encima de las barras).
- La figura del progreso: tarjeta con el nombre de la tarea y el **porcentaje
  grande**, la barra con su tirador y una nota corta.

## Iconos de navegación

- «Configuración» (engranaje) → **«Catálogos»** con icono de etiquetas, para no
  sugerir una personalización del sistema que todavía no existe.
- «Guía de uso» estrena icono de libro.
- El icono `settings` se conserva en `Icon.tsx` por si se retoma la
  personalización más adelante, pero ya no se usa en el menú.

## Validación

- `npx tsc --noEmit`, `npx eslint`, `npx next build`: correctos.
- Probado en el navegador: entrar/salir de un campo vacío no lo marca; escribir
  `ab<c` y salir marca solo ese campo (los demás vacíos siguen limpios); la
  ventana marca «Sin los símbolos < o >» en rojo mientras se escribe; enviar
  vacío marca todos; «x» de una notificación borra solo esa; la guía carga con
  sus 10 apartados y figuras.
