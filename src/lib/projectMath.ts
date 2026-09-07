import { prisma } from './prisma';

/** Meses (redondeados, mínimo 1) entre dos fechas. */
export function monthsBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  const months = ms / (1000 * 60 * 60 * 24) / 30.4375;
  return Math.max(1, Math.round(months));
}

export function assertDateOrder(start: Date, end: Date): void {
  if (end.getTime() < start.getTime()) {
    throw new Error('endDate no puede ser anterior a startDate');
  }
}

/**
 * Recalcula project.progress como el promedio del progreso de sus tareas.
 * Si no tiene tareas, no toca el valor (queda como estaba / 0).
 */
export async function recomputeProjectProgress(projectId: string): Promise<void> {
  const tasks = await prisma.task.findMany({ where: { projectId }, select: { progress: true } });
  if (tasks.length === 0) return;
  const avg = Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length);
  await prisma.project.update({ where: { id: projectId }, data: { progress: avg } });
}
