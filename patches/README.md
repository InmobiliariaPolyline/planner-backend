# Parches del proyecto

Esta carpeta documenta correcciones pequenas y verificables del proyecto.

Los parches se aplican directamente al codigo mediante cambios versionados. Esta
carpeta no es leida automaticamente por Render ni por Vercel.

## Regla para cada parche

1. Explicar el problema y el alcance.
2. Aplicar el cambio minimo.
3. Ejecutar la validacion indicada.
4. Registrar pendientes y riesgos conocidos.

## Parches registrados

- `001-persistencia-api.md`: elimina el fallback de proyectos en `localStorage`.

## Fuera de alcance por ahora

No se modifica la cadena de dependencias que `npm audit` reporto con tres
vulnerabilidades altas. La correccion automatica propone bajar Prisma 7 a Prisma
6, por lo que se esperara una actualizacion compatible antes de actuar.