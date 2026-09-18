-- AlterTable
ALTER TABLE "Task" ADD COLUMN "autoProgress" BOOLEAN NOT NULL DEFAULT true;

-- Las tareas que ya existían se tratan como progreso manual: su valor actual
-- no se toca ni se recalcula solo a partir de ahora.
UPDATE "Task" SET "autoProgress" = false;
