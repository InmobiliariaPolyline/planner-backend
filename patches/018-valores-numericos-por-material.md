# Parche 018: valores numéricos por cada dato de la métrica del material

## Qué se pidió

En el selector de materiales (parche 017), al elegir un material la
plantilla ya mostraba qué métrica necesita (p. ej. «Peso (kg) / Longitud
(m)»), pero solo había un campo genérico «Cantidad». Se pidió que el
usuario pueda **ingresar el valor numérico real de cada dato que pide esa
métrica** (por ejemplo, el peso en kg **y** la longitud en metros por
separado), porque son detalles que se quieren tener a mano después.

## Qué se construyó

- **`prisma/schema.prisma`**: `TaskMaterial.quantity` (un solo número) se
  reemplaza por `TaskMaterial.values` (`Json`): un número por cada valor
  que pide la métrica del material, por ejemplo para «Peso (kg / ton) /
  Longitud (m)»: `{ "Peso (kg / ton)": 120, "Longitud (m)": 5 }`.
  Migración `20260922030000_add_material_values`.
- **`src/lib/materials.ts`** (nuevo, con espejo en
  `frontend/lib/materials.ts`): `metricComponents(metricLabel)` separa la
  métrica de un material en sus valores necesarios, respetando paréntesis
  («Peso (kg / ton)» es un solo valor, no dos, por el «/» dentro del
  paréntesis) y descartando una nota final tipo «— se cotiza por…», que es
  solo informativa. `parseMaterialValues()` exige que lleguen todos esos
  valores, cada uno mayor que 0. Cubierto con pruebas unitarias
  (`test/validation.test.ts`) contra las 22 variantes reales de métrica del
  catálogo.
- **Backend**: `POST /tasks/:taskId/materials` ahora recibe `{ materialId,
  values }` en vez de `{ materialId, quantity }`.
- **Frontend** (`TaskFormModal.tsx`): al elegir un material aparece un
  campo numérico por cada valor de su métrica (en vez del campo único
  «Cantidad»), cada uno obligatorio y validado por separado. La lista de
  materiales ya elegidos muestra todos los valores ingresados.

## Aviso importante

**Esta migración borra la columna `quantity` de `TaskMaterial`.** Si ya
se había agregado algún material a una tarea real con la versión anterior
(parche 017), ese número se pierde al aplicar esta migración (habría que
volver a agregarlo con los nuevos campos). No hay forma de migrar ese dato
automáticamente porque no se sabe a cuál de los nuevos valores
correspondía.

## Validación

- `npx prisma validate`, `npx prisma generate`, `npm run build`, `npm test`
  (10, incluye las 2 pruebas nuevas de `metricComponents`/
  `parseMaterialValues`): correctos.
- Frontend: `npx tsc --noEmit`, `npx eslint . --quiet`, `npx next build`:
  correctos.

## Pendiente para el operador

Igual que el parche 017, correr contra la `DATABASE_URL` de producción:

```
npx prisma migrate deploy
```

(no hace falta volver a correr `seed:materials`; el catálogo no cambió,
solo la forma en que se guardan los valores elegidos por tarea).
