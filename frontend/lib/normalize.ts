import type { RawTask, Task } from "./types";
import { shortDate, toISO } from "./format";

export function normalizeTasks(tasks: RawTask[] = []): Task[] {
  return tasks.map((task, index) => {
    const startISO = toISO(task.startDate);
    const endISO = toISO(task.endDate);
    const area = task.technicalArea;
    return {
      id: String(task.id ?? index + 1),
      name: String(task.name ?? "Tarea sin nombre"),
      owner: String(task.ownerName ?? "Sin responsable"),
      startISO,
      endISO,
      start: shortDate(startISO),
      end: shortDate(endISO),
      progress: Number(task.progress ?? 0),
      phase: Boolean(task.isPhase),
      dependency: String(task.dependency ?? ""),
      technicalArea:
        typeof area === "object" && area !== null
          ? String((area as { name?: string }).name ?? "Sin área")
          : "Sin área",
      metrics: Array.isArray(task.performanceMetrics) ? task.performanceMetrics.length : 0,
      driveLinks: Array.isArray(task.driveLinks) ? task.driveLinks.length : 0,
    };
  });
}

/**
 * Geometría de la barra del Gantt sobre el rango real de fechas de las tareas
 * (antes usaba un timeline fijo de junio 2026 con un mapeo de meses que fallaba).
 */
export function barStyle(task: Task, rangeStart: number, rangeEnd: number): { left: string; width: string } {
  const start = new Date(task.startISO).getTime();
  const end = new Date(task.endISO).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { left: "0%", width: "0%" };
  const total = rangeEnd - rangeStart || 1;
  const left = Math.max(0, Math.min(100, ((start - rangeStart) / total) * 100));
  const width = Math.max(2, Math.min(100 - left, ((end - start) / total) * 100));
  return { left: `${left}%`, width: `${width}%` };
}
