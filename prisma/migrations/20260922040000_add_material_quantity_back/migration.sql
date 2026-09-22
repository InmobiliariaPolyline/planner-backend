-- Vuelve a agregar la cantidad del material (se habia quitado por error en
-- el parche 018, que solo debia sumar los valores de la metrica, no
-- reemplazar la cantidad).
ALTER TABLE "TaskMaterial" ADD COLUMN "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE "TaskMaterial" ALTER COLUMN "quantity" DROP DEFAULT;
