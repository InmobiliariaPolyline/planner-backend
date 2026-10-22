# Parche 025: Remasterización Next Gen UI

## Qué se pidió

Nueva UI completa: pantalla de carga, login, formularios, mejora de módulos,
10 animaciones nuevas, 10 transiciones nuevas e iconos propios (sin emojis).

## Qué se construyó (solo frontend)

- **Pantalla de carga:** tres anillos orbitales alrededor del logotipo, logotipo
  flotante con resplandor, mensajes de estado por etapa (Iniciando sistema,
  Cargando módulos, Verificando sesión, Todo listo) y barra con brillo.
- **Login:** panel lateral con manchas de luz animadas y cuadrícula, tres
  tarjetas de características con iconos, campos con icono, botón para
  mostrar/ocultar contraseña y mensaje de error con icono que se sacude.
- **Formularios:** el campo enfocado resalta su etiqueta e icono; anillo de foco
  con transición suave; errores con icono de alerta.
- **Iconos nuevos (SVG, sin emojis):** eye, eye-off, lock, user, sparkles,
  layers, activity, alert, info, check-circle.
- **Módulos:** cada módulo entra con deslizamiento (T8) y las tarjetas y
  paneles aparecen de forma escalonada (A6).

### 10 animaciones (`@keyframes`)

A1 `orbit` · A2 `float-y` · A3 `aurora-drift` · A4 `shake-x` · A5 `sheen` ·
A6 `stagger-rise` · A7 `glow-pulse` · A8 `bar-grow` · A9 `ripple` · A10 `badge-pop`

### 10 transiciones

T1 cambio de tema (fondos/bordes/texto) · T2 botones (elevación y hundimiento) ·
T3 tarjetas levitan · T4 anillo de foco de campos · T5 navegación lateral ·
T6 pestañas · T7 fondo de modales desenfocado · T8 entrada de módulo ·
T9 iconos de acción · T10 ancho de barras de progreso

Todo respeta `prefers-reduced-motion` (regla ya existente).

## Validación

`npx tsc --noEmit`, `npx eslint . --quiet` y `npx next build` sin errores.
Verificado en el navegador: carga, login, entrada a Dashboard y a Configuración,
sin errores en consola. No requiere cambios de backend ni migración.
