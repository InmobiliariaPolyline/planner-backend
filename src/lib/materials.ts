/** Divide la métrica de un material en los valores numéricos que hacen
 * falta pedir al usuario. Respeta los paréntesis, así que "Peso (kg / ton)"
 * es un solo valor (no dos) y "Volumen (m³) / Área (m²)" son dos. Una nota
 * final tipo "— se cotiza por…" es solo informativa y no cuenta. */
export function metricComponents(metricLabel: string): string[] {
  const [main] = metricLabel.split(' — ');
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of main) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === '/' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.filter(Boolean);
}

/** Valida que `input` traiga un número mayor que 0 para cada valor que pide
 * la métrica del material (ni de más ni de menos). */
export function parseMaterialValues(input: unknown, metricLabel: string): Record<string, number> {
  const components = metricComponents(metricLabel);
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('values debe traer un número por cada valor de la métrica del material');
  }
  const record = input as Record<string, unknown>;
  const values: Record<string, number> = {};
  for (const component of components) {
    const raw = record[component];
    const number = Number(raw);
    if (raw === undefined || raw === null || raw === '' || !Number.isFinite(number) || number <= 0) {
      throw new Error(`Ingresa un valor mayor que 0 para "${component}"`);
    }
    values[component] = number;
  }
  return values;
}

/** Cantidad del material a usar en la tarea: debe ser un número mayor que 0
 * (0 o negativo no tiene sentido como cantidad a usar). */
export function parseQuantity(value: unknown): number {
  const number = Number(value);
  if (value === undefined || value === null || value === '' || !Number.isFinite(number) || number <= 0) {
    throw new Error('quantity debe ser un número mayor que 0');
  }
  return number;
}

export function formatMaterialValues(values: Record<string, number>): string {
  return Object.entries(values)
    .map(([label, value]) => `${label}: ${value}`)
    .join(', ');
}
