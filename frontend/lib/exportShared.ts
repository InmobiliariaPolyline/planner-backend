// Utilidades comunes de las exportaciones (Excel y PDF).

import { formatMaterialValues } from "./materials";
import type { Project, RawTask, TaskMaterial } from "./types";

const DIACRITICS = /[̀-ͯ]/g;

/** Nombre de archivo seguro a partir del nombre del expediente. */
export function slug(text: string): string {
  const base = (text || "expediente")
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || "expediente";
}

export function taskRows(project: Project): RawTask[] {
  return (project.tasks ?? []) as RawTask[];
}

/** Una fila por material de cada tarea: [tarea, categoría, material, cantidad, valores]. */
export function materialRows(project: Project): (string | number)[][] {
  return taskRows(project).flatMap((t) =>
    ((t.taskMaterials ?? []) as TaskMaterial[]).map((tm) => [
      String(t.name ?? ""),
      tm.material.category,
      tm.material.name,
      tm.quantity,
      formatMaterialValues(tm.values ?? {}),
    ]),
  );
}
