import type { Response } from 'express';
import type { AuthUser } from './auth';
import { prisma } from './prisma';

/** Se lanza cuando el usuario no tiene acceso a un expediente; se responde
 * como 404 (no 403) para no revelar si el expediente existe. */
export class ProjectAccessError extends Error {
  status = 404;
  constructor() {
    super('Expediente no encontrado');
  }
}

/** Filtro de Prisma con los expedientes visibles para el usuario: el
 * Administrador ve todos; un Arquitecto sólo los que creó o donde está
 * vinculado como participante del equipo. */
export function visibleProjectsWhere(user: AuthUser) {
  if (user.role === 'admin') return {};
  return {
    OR: [{ createdById: user.id }, { teamMembers: { some: { userId: user.id } } }],
  };
}

export async function assertProjectAccess(user: AuthUser, projectId: string): Promise<void> {
  if (user.role === 'admin') return;
  const count = await prisma.project.count({ where: { id: projectId, ...visibleProjectsWhere(user) } });
  if (count === 0) throw new ProjectAccessError();
}

/** Resuelve el expediente de una tarea y comprueba el acceso. */
export async function assertTaskAccess(user: AuthUser, taskId: string): Promise<{ projectId: string }> {
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true } });
  if (!task) throw new ProjectAccessError();
  await assertProjectAccess(user, task.projectId);
  return task;
}

/** Se lanza cuando el usuario ve la tarea pero no tiene permiso para esta
 * acción en concreto (a diferencia de ProjectAccessError, aquí sí existe y se
 * puede ver, por eso 403 y no 404). */
export class ForbiddenError extends Error {
  status = 403;
}

/** Solo quien creó el expediente (o el Administrador) puede fijar el avance
 * de una tarea a mano; el resto puede verlo pero no ajustarlo. */
export async function assertProgressEditAccess(user: AuthUser, taskId: string): Promise<void> {
  if (user.role === 'admin') return;
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { project: { select: { createdById: true } } },
  });
  if (!task) throw new ProjectAccessError();
  if (task.project.createdById !== user.id) {
    throw new ForbiddenError('Solo quien creó el expediente (o el Administrador) puede ajustar el avance a mano.');
  }
}

/** Respuesta de error homogénea: el estado propio si es un error conocido, si no el indicado. */
export function respondError(error: unknown, res: Response, fallbackStatus = 400, fallbackMessage = 'Error') {
  if (error instanceof ProjectAccessError || error instanceof ForbiddenError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  res.status(fallbackStatus).json({ error: error instanceof Error ? error.message : fallbackMessage });
}
