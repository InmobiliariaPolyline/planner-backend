import { prisma } from './prisma';

export type Tone = 'neutral' | 'positive' | 'negative' | 'warning';

export type FieldChange = { field: string; label: string; from: string; to: string };

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

/**
 * Registra un suceso del expediente. No lanza nunca: un fallo de auditoría no
 * debe tumbar la operación que lo originó.
 */
export async function logEvent(projectId: string, input: LogInput): Promise<void> {
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
    changes.push({ field: def.key, label: def.label, from: fmt(a), to: fmt(b) });
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
