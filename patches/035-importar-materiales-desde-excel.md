# Parche 035: Importar los materiales desde el Excel

## Qué cambia

El parche 034 añadió la hoja «Materiales» al Excel exportado; ahora el
importador también la lee, así que un respaldo ya no pierde los materiales.

- **Frontend (`lib/transfer.ts`):** lee la hoja opcional «Materiales» (tarea,
  categoría, material, cantidad, valores de la métrica) y asigna cada fila a la
  primera tarea con ese nombre. Los valores `Peso (kg): 120, Longitud (m): 5` se
  convierten de nuevo en números (admite coma o punto decimal).
- **Backend (`POST /projects/import`):** cada material se busca en el catálogo por
  categoría y nombre y se valida con las mismas reglas que al agregarlo a mano
  (cantidad y cada valor mayores que 0). Los que no existen o traen valores
  inválidos se **omiten** sin frenar la importación; el historial lo registra
  («N materiales (M omitidos)»).
- Los respaldos antiguos, sin la hoja, se importan igual que antes.

Requiere que Render redespliegue el backend. No requiere migración.

## Validación

`tsc` (backend y frontend), `eslint` y las 11 pruebas unitarias pasan. El lector
de valores se probó con casos reales («Peso (kg / ton): 120, Longitud (m): 5.5»,
coma decimal y vacío). No se probó una importación completa contra la base de
producción.
