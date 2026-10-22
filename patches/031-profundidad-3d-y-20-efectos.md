# Parche 031: Profundidad 3D y 20 efectos nuevos

## Qué se pidió

Devolver los efectos 3D al diseño y sumar unos 20 efectos nuevos.

## Base

Se mantiene la estructura plana moderna del parche 030 (tipografía, paleta,
barra lateral, tarjetas con borde) y se le devuelve la profundidad: sombras
reales en dos niveles de tema, elevación al pasar el cursor, vidrio en barra
superior y modales, botones con volumen y degradado, resplandores y luces
animadas en carga y login.

## 20 efectos nuevos (`globals.css` sección 11 y `components/ui/FxLayer.tsx`)

FX1 inclinación 3D de tarjetas con el cursor · FX2 foco de luz que sigue al
cursor en tarjetas · FX3 botones primarios magnéticos · FX4 barrido de brillo
en botones · FX5 modales que entran girando en 3D · FX6 paralaje de las luces
del login y la carga · FX7 titular con degradado que se desplaza · FX8 borde
de degradado giratorio en tarjetas · FX9 línea de carga superior al cambiar de
módulo · FX10 campana que suena con notificaciones · FX11 icono de tema que
gira al pulsar · FX12 anillo expansivo en «en línea» · FX13 filas de listas en
cascada · FX14 revelado al hacer scroll · FX15 avisos con rebote elástico ·
FX16 casillas con pop · FX17 subrayado de enlaces que crece · FX18 barras del
Gantt con brillo · FX19 módulo activo con resplandor que respira · FX20 cifras
que flotan con resplandor · (extra) foco de luz de fondo que sigue al cursor.

`FxLayer` solo añade variables CSS por delegación de eventos y se desactiva
con «reducir movimiento» y en pantallas táctiles.

## Validación

`npx tsc --noEmit`, `npx eslint . --quiet` y `npx next build` sin errores.
Verificado en el navegador: la tarjeta se inclina (matrix3d), proyecta sombra
y recibe el foco de luz. No requiere migración.
