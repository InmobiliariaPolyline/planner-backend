import { AsyncLocalStorage } from 'node:async_hooks';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';

// Rutas que no requieren sesión: la pantalla de acceso, el health check, los
// enlaces públicos de expediente (esos tienen su propio control con el token
// de ShareLink, ver src/lib/share.ts) y el segundo paso del login con
// verificación en dos pasos (todavía no hay sesión en ese momento).
const PUBLIC_PATHS: RegExp[] = [
  /^\/$/,
  /^\/health$/,
  /^\/auth\/login$/,
  /^\/auth\/2fa\/login-verify$/,
  /^\/auth\/2fa\/login-resend$/,
  /^\/shared\//,
];

const TOKEN_TTL = '12h';

export type Role = 'admin' | 'architect' | 'civil';

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrador',
  architect: 'Arquitecto',
  civil: 'Civil',
};

/** Roles que el Administrador puede asignar al crear una cuenta nueva. */
export const CREATABLE_ROLES: Role[] = ['architect', 'civil'];

export type AuthUser = { id: string; username: string; name: string; role: Role };

export type ActorUser = AuthUser & { actorLabel: string };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/** Convierte un nombre en un usuario de acceso válido: "José" -> "jose". */
export function slugifyUsername(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9._-]/g, '');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) {
    // Sin JWT_SECRET no se pueden emitir ni comprobar sesiones: es un error de
    // configuración del servidor, no algo que el usuario pueda arreglar.
    throw new Error('JWT_SECRET no está configurado en el servidor.');
  }
  return value;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, secret(), { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, secret()) as AuthUser;
  } catch {
    return null;
  }
}

/** "Arquitecto (Ana)" — texto para el actor del historial. */
export function actorLabel(user: AuthUser): string {
  return `${ROLE_LABEL[user.role] ?? user.role} (${user.name})`;
}

// Guarda el usuario de la petición en curso para que el registro de actividad
// (src/lib/activity.ts) sepa automáticamente quién hizo cada cosa, sin tener
// que pasar el actor a mano en cada ruta.
const requestContext = new AsyncLocalStorage<AuthUser>();

/** Etiqueta del usuario autenticado en la petición actual, si la hay. */
export function currentActor(): string | undefined {
  const user = requestContext.getStore();
  return user ? actorLabel(user) : undefined;
}

/**
 * Exige una sesión válida (cabecera `Authorization: Bearer <token>`) en todas
 * las rutas salvo la pantalla de acceso, el health check y los enlaces
 * públicos. Si el servidor no tiene JWT_SECRET configurado, todo responde 500
 * en vez de dejar pasar peticiones sin validar.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (PUBLIC_PATHS.some((pattern) => pattern.test(req.path))) {
    next();
    return;
  }
  let user: AuthUser | null;
  try {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    user = token ? verifyToken(token) : null;
  } catch (error) {
    console.error('Fallo de configuración de autenticación:', error);
    res.status(500).json({ error: 'El servidor no tiene la sesión configurada correctamente.' });
    return;
  }
  if (!user) {
    res.status(401).json({ error: 'Tu sesión no es válida o caducó. Vuelve a iniciar sesión.' });
    return;
  }
  req.user = user;
  requestContext.run(user, () => next());
}
