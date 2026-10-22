# Parche 036: Mejor diseño del PDF y del Excel exportados

## Excel (`frontend/lib/transfer.ts`)

- Cabecera de color de marca con texto blanco, fija al desplazarse (fila congelada).
- Ancho de columna adecuado a cada hoja, texto que se ajusta dentro de la celda.
- Filas alternadas, bordes finos y alineación por tipo de dato (fechas centradas,
  cantidades a la derecha).
- «Avance %» con formato `45%` y en verde cuando llega a 100.
- La cabecera sigue en la fila 1 con los mismos textos: **el importador lee los
  archivos nuevos igual que los anteriores** (verificado con una ida y vuelta,
  materiales incluidos).

## PDF

- Banda de color con el nombre del expediente, subtítulo y fecha de exportación.
- Tarjetas de cifras clave (responsable, presupuesto, periodo y avance con barra).
- Secciones con marca de color y contador; tablas con cabecera tintada, filas
  alternadas, texto ajustado a su columna y cabecera que se repite al cambiar de
  página.
- Tareas con **barra de avance** (verde al 100 %); bloque de Materiales con tarea,
  material, categoría, cantidad y valores.
- Pie en todas las páginas: «Project Planner V1.0.0» y «Página X de Y».
- El PDF de historial usa el mismo diseño (fecha y hora, actor y suceso con sus
  cambios).

## Validación

`tsc`, `eslint` y `next build` sin errores. Se generaron PDF y Excel reales con
datos ficticios (22 tareas, materiales, historial) y se revisaron visualmente
(PDF) y con openpyxl (Excel). No requiere migración ni cambios de backend.
