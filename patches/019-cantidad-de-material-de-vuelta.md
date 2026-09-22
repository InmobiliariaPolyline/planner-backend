# Parche 019: la cantidad del material vuelve (junto a los valores de la métrica)

## Qué se pidió

El parche 018 quitó por error el campo «Cantidad» al agregar los campos
por cada valor de la métrica. La idea original (parche 017) era tener
**ambos**: la cantidad del material que se va a usar en la tarea, **más**
los valores propios de la métrica de ese material exacto. Se pidió
recuperar la cantidad.

## Qué se construyó

- **`prisma/schema.prisma`**: `TaskMaterial` vuelve a tener `quantity`
  (`Float`, obligatorio) además de `values` (los valores de la métrica del
  parche 018). Migración `20260922040000_add_material_quantity_back`.
- **Backend**: `POST /tasks/:taskId/materials` recibe `{ materialId,
  quantity, values }`.
- **Frontend** (`TaskFormModal.tsx`): el selector de materiales vuelve a
  mostrar «Cantidad a usar» (justo debajo de la densidad/métrica de
  referencia), y debajo un campo por cada valor de la métrica del
  material. La lista de materiales ya elegidos muestra la cantidad y,
  si aplica, los valores de la métrica.

## Validación

- `npx prisma validate`, `npx prisma generate`, `npm run build`, `npm test`
  (10): correctos.
- Frontend: `npx tsc --noEmit`, `npx eslint . --quiet`, `npx next build`:
  correctos.
- Verificado visualmente en el navegador: al elegir «Cobre» (métrica
  «Peso (kg) / Longitud (m)») aparecen, en orden: densidad de referencia,
  «Cantidad a usar», «Peso (kg)» y «Longitud (m)» como campos separados.
  No se pudo probar el guardado real porque la migración de este parche
  todavía no está aplicada en producción.

## Pendiente para el operador

Igual que los parches 017 y 018, correr contra la `DATABASE_URL` de
producción:

```
npx prisma migrate deploy
```
