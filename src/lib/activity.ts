import { prisma } from './prisma';

export type Tone = 'neutral' | 'positive' | 'negative' | 'warning';

export type FieldChange = {
  field: string;
  label: string;
  from: string;
  to: string;
  /** Sólo para valores numéricos: si el valor nuevo subió o bajó. */
  dir?: 'up' | 'down';
};

type LogInput = {
  actor?: string;
  action: string;
  entity: string;
  target?: string | null;
  summary: string;
  tone?: Tone;
  changes?: FieldChange[];
};

export const ACTOR_ADMIN = 'Administrador';
export const ACTOR_LINK = 'Colaborador (enlace)';

// El historial de un expediente se conserva 1 año + 2 semanas de margen.
// Pasado ese plazo, cada suceso se borra solo (limpieza perezosa al leer/escribir).
export const RETENTION_DAYS = 365 + 14;

let lastPrune = 0;

/**
 * Borra de toda la base los sucesos con más de RETENTION_DAYS. Limpieza
 * perezosa: se lanza al leer o escribir el historial, como mucho una vez por
 * minuto, así no hace falta un cron.
 */
export async function pruneOldActivity(): Promise<void> {
  const now = Date.now();
  if (now - lastPrune < 60_000) return;
  lastPrune = now;
  const cutoff = new Date(now - RETENTION_DAYS * 86_400_000);
  try {
    await prisma.activityEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
  } catch (error) {
    console.error('No se pudo limpiar el historial antiguo:', error);
  }
}

/**
 * Registra un suceso del expediente. No lanza nunca: un fallo de auditoría no
 * debe tumbar la operación que lo originó.
 */
export async function logEvent(projectId: string, input: LogInput): Promise<void> {
  void pruneOldActivity();
  try {
    await prisma.activityEvent.create({
      data: {
        projectId,
        actor: input.actor ?? ACTOR_ADMIN,
        action: input.action,
        entity: input.entity,
        target: input.target ?? null,
        summary: input.summary,
        tone: input.tone ?? 'neutral',
        changes: input.changes && input.changes.length ? input.changes : undefined,
      },
    });
  } catch (error) {
    console.error('No se pudo registrar el suceso de actividad:', error);
  }
}

type FieldDef = {
  key: string;
  label: string;
  format?: (value: unknown) => string;
};

const defaultFormat = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  return String(value);
};

/** Compara `before` y `after` y devuelve sólo los campos que cambiaron. */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  defs: FieldDef[],
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const def of defs) {
    const a = before[def.key];
    const b = after[def.key];
    if (b === undefined) continue; // el campo no venía en el PATCH
    const equal =
      a instanceof Date && b instanceof Date
        ? a.getTime() === b.getTime()
        : a === b;
    if (equal) continue;
    const fmt = def.format ?? defaultFormat;
    const change: FieldChange = { field: def.key, label: def.label, from: fmt(a), to: fmt(b) };
    if (typeof a === 'number' && typeof b === 'number') {
      change.dir = b > a ? 'up' : 'down';
    }
    changes.push(change);
  }
  return changes;
}

export const money = (value: unknown): string => {
  const n = Number(value);
  if (!Number.isFinite(n)) return defaultFormat(value);
  return n.toLocaleString('es', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
};

export const percent = (value: unknown): string => {
  const n = Number(value);
  return Number.isFinite(n) ? `${n}%` : defaultFormat(value);
};
