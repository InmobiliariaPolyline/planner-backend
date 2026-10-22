# Parche 038: Sonido suave al llegar una notificación

## Qué cambia (solo frontend)

- `lib/sound.ts`: tono generado con Web Audio, sin archivos. Dos notas sinusoidales
  cortas (Mi5 y La5), volumen bajo, filtro paso bajo y desvanecimiento de ~0,9 s.
- `PlannerApp.tsx`: suena cuando llega una notificación **nueva**. Las que se cargan
  al abrir la app no suenan (se distinguen por la marca de tiempo de su id).
- Sistema → Accesibilidad: interruptor «Sonido de notificaciones» (activado por
  defecto) y botón «Probar». La preferencia se guarda en el navegador
  (`notifySound` en `lib/preferences.ts`).

Nota: el navegador mantiene el audio bloqueado hasta que la persona hace clic en la
página; con la sesión ya iniciada eso ya ocurrió.

## Validación

`tsc` y `eslint` sin errores. En el navegador, «Probar» crea los dos osciladores
(659,25 y 880 Hz) sin errores y el interruptor se guarda. El disparo automático con
una notificación real no se probó de extremo a extremo.
