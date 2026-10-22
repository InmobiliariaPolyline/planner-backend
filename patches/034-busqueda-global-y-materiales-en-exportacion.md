# Parche 034: Búsqueda global y materiales en la exportación

## Qué cambia (solo frontend)

- **Búsqueda global (Ctrl+K / ⌘K):** el icono de lupa de la barra superior solo
  abría «Mis expedientes». Ahora abre una paleta de búsqueda con módulos,
  expedientes y tareas (nombre, responsable). Se navega con ↑ ↓, Enter abre y
  Esc cierra. Los resultados cuyo título coincide van antes que los que solo
  coinciden en la descripción.
- **Materiales en la exportación:** el Excel del expediente tiene una hoja nueva
  «Materiales» (tarea, categoría, material, cantidad, valores de la métrica) y
  el PDF un bloque «Materiales». El importador no cambia (ignora la hoja
  nueva), así que los respaldos siguen siendo compatibles.

Pendiente: importar los materiales desde el Excel (hay que resolverlos contra
el catálogo por categoría y nombre).

## Validación

`npx tsc --noEmit`, `npx eslint . --quiet` y `npx next build` sin errores.
Verificado en el navegador: Ctrl+K abre la paleta, filtra expedientes y módulos,
Enter abre el módulo elegido. La exportación con materiales se comprobó solo
por tipos (no hay tareas con materiales cargadas).
