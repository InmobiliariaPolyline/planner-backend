# Parche 033: «Configuración» pasa a ser el módulo «Sistema»

## Qué se pidió

Renombrar Configuración a «Sistema», con submódulos como sub-barras laterales
(perfil, temas personalizables, seguridad…).

## Qué se construyó (solo frontend)

El módulo `Sistema` (`SystemView.tsx`, reemplaza a `ConfigView.tsx`) tiene una
**sub-barra lateral** con cinco submódulos (en móvil pasa a pestañas con scroll):

- **Perfil:** nombre, usuario y rol de la cuenta.
- **Apariencia (temas personalizables):** tema claro/oscuro, **color de acento**
  (8 colores o uno personalizado con selector), esquinas (rectas/suaves/redondas),
  densidad (cómoda/compacta), efectos (con profundidad o plano) y vista previa.
- **Accesibilidad:** tamaño del texto (4 niveles), reducir movimiento y alto
  contraste.
- **Seguridad:** cambio de contraseña, estado de la verificación en dos pasos
  (en pausa, ver parche 016) y cierre de sesión.
- **Estado del sistema:** comprobación de la API (`/health`, con latencia) y
  restablecimiento de las preferencias guardadas.

Las preferencias se guardan en este navegador (`lib/preferences.ts`,
localStorage) y se aplican a toda la app, incluido el login, como atributos
`data-*` y variables CSS sobre `<html>` (`PrefsApplier.tsx` y un script de
arranque que evita el parpadeo). El efecto «Plano» y «Reducir movimiento»
también desactivan los efectos que siguen al cursor (`FxLayer.tsx`).

La vista interna pasó de `config` a `system`. No requiere migración.

## Validación

`npx tsc --noEmit`, `npx eslint . --quiet` y `npx next build` sin errores.
Verificado en el navegador: acento, esquinas, efectos planos, tamaño de texto y
reducción de movimiento se aplican y se guardan; Seguridad y Estado del
sistema (API en línea) funcionan; «Restablecer todo» vuelve a los valores
predeterminados.

## Versión del sistema

`frontend/lib/version.ts` define la versión que se muestra en la interfaz
(`V1.0.0`, parche 033, octubre 2026): al pie de la barra lateral, en la
cabecera del login y en Sistema → Estado del sistema. Sube el número ahí
cuando salga una versión nueva.
