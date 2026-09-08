# Parche 010: importar/exportar, retención del historial y avisos

## Avisos de resultado (toasts)

- **`hooks/useToasts.ts`** + **`components/ui/Toaster.tsx`**: avisos flotantes
  arriba a la derecha. **Verde con ✓** al crear/eliminar algo; **rojo con ✕**
  cuando algo falla. El éxito se va solo a los ~4 s; el error se queda hasta
  cerrarlo.
- **`lib/errors.ts`** → `friendlyError()`: traduce los errores (del backend o de
  red) a una frase clara en español, sin jerga. Se usa en los toasts y en los
  mensajes de todos los formularios y diálogos.

## Retención del historial

- El historial de cada expediente se conserva **1 año + 2 semanas** (379 días).
  Pasado ese plazo, cada suceso se borra solo de la base.
- `src/lib/activity.ts` → `pruneOldActivity()`: limpieza perezosa (al leer o
  escribir el historial, como mucho una vez por minuto). No hace falta cron.

## Exportar (Excel y PDF)

- **`lib/transfer.ts`** con `write-excel-file` y `jspdf` (0 vulnerabilidades):
  - **Expediente → Excel**: hojas *Expediente*, *Tareas*, *Hitos*, *Equipo*
    (formato reimportable). Botón en la cabecera del detalle.
  - **Expediente → PDF**: informe para leer o imprimir.
  - **Historial → Excel / PDF**: botones en la pestaña «Historial».

## Importar (Excel)

- **Expediente** (botón «Importar» en «Mis expedientes»): crea el expediente al
  instante. Las áreas técnicas y estados de equipo se resuelven **por nombre**
  (se crean si no existen). Endpoint `POST /projects/import`.
- **Historial** (botón «Importar» en la pestaña «Historial»): reingresa los
  sucesos **con su fecha original**, así quedan ordenados donde corresponde.
  Se descartan los duplicados y los que superan la retención. Endpoint
  `POST /projects/:projectId/activity/import`.

## Validación

- `npm run build`, `npm test` (8), `npx tsc`, `npx eslint`, `npx next build`:
  correctos.
- En el navegador: los toasts verde/rojo aparecen al crear/eliminar; la
  exportación a Excel genera el `.xlsx`; los botones de importar abren el
  selector de archivos.
- Los endpoints `POST /projects/import` y `.../activity/import` necesitan que
  Render redepliegue el backend (no requieren migración nueva).
