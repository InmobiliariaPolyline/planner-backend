import { prisma } from './prisma';

/**
 * % transcurrido entre dos fechas (0-100, redondeado), medido en días
 * calendario completos (UTC, igual convención que startDate/endDate) en vez
 * de la hora exacta — así no varía según la hora del día en que se consulta,
 * solo según qué día es.
 */
export function computeAutoProgress(start: Date, end: Date, now: Date = new Date()): number {
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 100;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const elapsed = today - start.getTime();
  const pct = (elapsed / total) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

type AutoTask = { id: string; startDate: Date; endDate: Date; autoProgress: boolean; progress: number };

/**
 * Recalcula (y persiste) el progreso de las tareas en modo automático de una
 * lista ya cargada en memoria — muta los objetos recibidos para que la
 * respuesta HTTP salga con el valor fresco sin tener que volver a leerlos.
 * Devuelve true si algún valor cambió (para saber si hay que recalcular el
 * promedio del expediente).
 */
export async function syncAutoProgress(tasks: AutoTask[]): Promise<boolean> {
  const now = new Date();
  const updates = tasks
    .filter((task) => task.autoProgress)
    .map((task) => ({ task, next: computeAutoProgress(task.startDate, task.endDate, now) }))
    .filter(({ task, next }) => task.progress !== next);
  if (!updates.length) return false;
  await Promise.all(updates.map(({ task, next }) => prisma.task.update({ where: { id: task.id }, data: { progress: next } })));
  for (const { task, next } of updates) task.progress = next;
  return true;
}
