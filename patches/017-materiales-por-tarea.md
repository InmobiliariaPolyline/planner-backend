# Parche 017: materiales por tarea (reemplaza «métricas de rendimiento»)

## Qué se pidió

Al crear o editar una tarea, un Arquitecto o Ingeniero Civil debe poder
elegir uno o varios materiales de construcción (desglosados por categoría),
indicar la cantidad que va a usar de cada uno, y ver que cada material —no
solo su categoría— tiene sus propios valores de densidad y métrica de
cómputo. Dos materiales de la misma categoría (p. ej. dos tipos de
Concreto) pueden elegirse a la vez y cada uno mantiene sus propios valores;
nunca se combinan entre sí. Esta función **reemplaza** la de «métricas de
rendimiento» que existía en las tareas.

## Qué se construyó

### Catálogo de materiales

Se cargó un catálogo de referencia (501 materiales en 27 categorías: Concreto,
Acero y hierro, Metales no ferrosos, Madera, Mampostería, Piedra natural,
Vidrio, Aislamiento, Yeso y placas, Plásticos y polímeros, Paneles y
compuestos, Pisos y revestimientos, Techos y membranas, Membranas textiles,
Suelos y áridos, Tuberías y conducciones, Geosintéticos, Adhesivos y
selladores, Fachadas y revestimiento exterior, Prefabricados de concreto,
Fibras de refuerzo, Pisos técnicos y cielos rasos, Paisajismo y exteriores,
Aceros e instalaciones, Pavimentación vial, Materiales ignífugos y
contrafuego, Carpintería de puertas y ventanas), cada uno con su densidad
(kg/m³) y la métrica de cómputo que usa (Volumen, Área, Peso, Longitud,
unidad, o combinaciones).

- **`prisma/schema.prisma`**: modelo `Material` (catálogo, único por
  categoría+nombre) y `TaskMaterial` (una fila por cada material elegido en
  una tarea, con su `quantity`; cada fila es independiente). Se elimina el
  modelo `PerformanceMetric`.
  Migración `20260922020000_add_materials`.
- **`scripts/seed-materials.ts`** (nuevo): siembra el catálogo completo
  (upsert por categoría+nombre; no borra materiales ya en uso). Se corre
  con `npm run seed:materials` contra la `DATABASE_URL` de destino.

### Backend

- **`GET /materials`** (con `?category=` opcional): lista el catálogo.
- **`POST /tasks/:taskId/materials`**: agrega un material elegido a una
  tarea con su cantidad.
- **`DELETE /task-materials/:id`**: quita un material de una tarea.
- `taskInclude` / `projectInclude` ahora traen `taskMaterials` (con su
  `material`) en vez de `performanceMetrics`.
- Se eliminaron `POST /tasks/:taskId/performance-metrics` y
  `DELETE /performance-metrics/:id`.

### Frontend

- **`TaskFormModal.tsx`**: al **crear** una tarea aparece un selector
  Categoría → Material → Cantidad; cada material añadido se muestra en una
  lista (con su densidad y métrica) antes de guardar, y se envían al
  backend justo después de crear la tarea. Al **editar**, el mismo selector
  agrega/quita materiales de inmediato contra la API (como antes hacían las
  métricas).
- **`GanttChart.tsx`**: la leyenda de cada tarea ahora dice «N materiales»
  en vez de «N métricas».
- **`lib/types.ts` / `lib/api.ts` / `lib/normalize.ts`**: se quitó
  `PerformanceMetric` y se agregaron `Material` y `TaskMaterial`, además de
  `listMaterials`, `addTaskMaterial` y `deleteTaskMaterial`.

## Validación

- `npx prisma validate`, `npx prisma generate`, `npm run build`, `npm test`
  (8): correctos.
- Frontend: `npx tsc --noEmit`, `npx eslint . --quiet`, `npx next build`:
  correctos.
- **Pendiente de verificar en el navegador**: crear/editar una tarea con
  materiales y confirmar el flujo completo, una vez aplicada la migración
  (ver «Pendiente» abajo). No se pudo hacer en esta sesión porque aplicar la
  migración a Neon requiere autorización explícita del operador (ver más
  abajo).

## Pendiente para el operador

**A diferencia de parches anteriores, esta vez el sistema no me dejó correr
la migración directamente** (el clasificador de la sesión la bloqueó por
tratarse de un despliegue a producción). Hace falta correr, con la
`DATABASE_URL` de producción:

```
npx prisma migrate deploy
npm run seed:materials
```

El primer comando crea las tablas `Material` y `TaskMaterial` (y borra la
tabla `PerformanceMetric`, que ya no se usa). El segundo carga el catálogo
de 501 materiales. Es seguro correr `seed:materials` más de una vez.
