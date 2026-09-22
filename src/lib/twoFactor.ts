import { randomInt } from 'node:crypto';
import { hashPassword, verifyPassword } from './auth';
import { sendTwoFactorEmail, type TwoFactorPurpose } from './email';
import { prisma } from './prisma';

export const COOLDOWN_SECONDS = 120;
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export class CooldownError extends Error {
  status = 429;
  constructor(public retryAfterSeconds: number) {
    super(`Espera ${retryAfterSeconds} s antes de pedir otro código.`);
  }
}

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/**
 * Genera y envía un código de 6 dígitos. Respeta un cupo de 2 min entre
 * envíos por usuario+propósito (borra el código anterior de ese propósito al
 * emitir uno nuevo, así solo el más reciente es válido).
 */
export async function issueTwoFactorCode(
  userId: string,
  purpose: TwoFactorPurpose,
  email: string,
): Promise<{ challengeId: string; cooldownSeconds: number }> {
  const recent = await prisma.twoFactorCode.findFirst({
    where: { userId, purpose },
    orderBy: { createdAt: 'desc' },
  });
  if (recent) {
    const elapsedMs = Date.now() - recent.createdAt.getTime();
    if (elapsedMs < COOLDOWN_SECONDS * 1000) {
      throw new CooldownError(Math.ceil((COOLDOWN_SECONDS * 1000 - elapsedMs) / 1000));
    }
  }
  await prisma.twoFactorCode.deleteMany({ where: { userId, purpose } });

  const code = generateCode();
  const codeHash = await hashPassword(code);
  const record = await prisma.twoFactorCode.create({
    data: { userId, purpose, email, codeHash, expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });
  try {
    await sendTwoFactorEmail(email, code, purpose);
  } catch (error) {
    // Si el correo no salió, no debe quedar activo el cupo de 2 min: se borra
    // el código para que la persona pueda intentarlo de nuevo enseguida.
    await prisma.twoFactorCode.delete({ where: { id: record.id } }).catch(() => undefined);
    throw error;
  }
  return { challengeId: record.id, cooldownSeconds: COOLDOWN_SECONDS };
}

/** Comprueba el código de un desafío; lo borra si acierta, expira o se agotan los intentos. */
export async function verifyTwoFactorCode(
  challengeId: string,
  code: string,
): Promise<{ userId: string; purpose: TwoFactorPurpose; email: string }> {
  const record = await prisma.twoFactorCode.findUnique({ where: { id: challengeId } });
  if (!record) throw new Error('Ese código ya no es válido. Pide uno nuevo.');
  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.twoFactorCode.delete({ where: { id: record.id } }).catch(() => undefined);
    throw new Error('El código caducó. Pide uno nuevo.');
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.twoFactorCode.delete({ where: { id: record.id } }).catch(() => undefined);
    throw new Error('Demasiados intentos. Pide un código nuevo.');
  }
  const ok = await verifyPassword(code, record.codeHash);
  if (!ok) {
    await prisma.twoFactorCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    throw new Error('El código no es correcto.');
  }
  await prisma.twoFactorCode.delete({ where: { id: record.id } });
  return { userId: record.userId, purpose: record.purpose as TwoFactorPurpose, email: record.email };
}
