import { randomBytes } from 'crypto';
import { prisma } from './prisma';

export type ShareRole = 'viewer' | 'editor';

/** Token opaco, imposible de adivinar, seguro para URLs. No caduca; se rota. */
export function newShareToken(): string {
  return randomBytes(24).toString('base64url');
}

export function parseRole(value: unknown): ShareRole {
  return value === 'editor' ? 'editor' : 'viewer';
}

export class ShareAccessError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Resuelve un token a su enlace, o lanza 410 si ya no existe. */
export async function resolveShareLink(token: string) {
  const link = await prisma.shareLink.findUnique({ where: { token } });
  if (!link) throw new ShareAccessError(410, 'El enlace ya no es válido o el expediente fue eliminado.');
  return link;
}

/** Igual que resolveShareLink pero exige rol de editor (403 si es de solo lectura). */
export async function requireEditorLink(token: string) {
  const link = await resolveShareLink(token);
  if (link.role !== 'editor') {
    throw new ShareAccessError(403, 'Este enlace es de solo lectura.');
  }
  return link;
}
