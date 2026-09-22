-- Elimina la funcion de "metricas de rendimiento" (se reemplaza por materiales)
DROP TABLE IF EXISTS "PerformanceMetric";

-- Catalogo de materiales de referencia
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "density" DOUBLE PRECISION NOT NULL,
    "metricLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Material_category_name_key" ON "Material"("category", "name");
CREATE INDEX "Material_category_idx" ON "Material"("category");

-- Seleccion de materiales por tarea, con cantidad
CREATE TABLE "TaskMaterial" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskMaterial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskMaterial_taskId_idx" ON "TaskMaterial"("taskId");
CREATE INDEX "TaskMaterial_materialId_idx" ON "TaskMaterial"("materialId");

ALTER TABLE "TaskMaterial" ADD CONSTRAINT "TaskMaterial_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskMaterial" ADD CONSTRAINT "TaskMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
