-- Reemplaza la cantidad unica de TaskMaterial por un mapa de valores (uno
-- por cada dato que pide la metrica del material, p. ej. "Peso (kg)" y
-- "Longitud (m)" por separado).
ALTER TABLE "TaskMaterial" ADD COLUMN "values" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "TaskMaterial" DROP COLUMN "quantity";
