// Debe reflejar exactamente src/lib/materials.ts del backend: divide la
// métrica de un material en los valores numéricos que hace falta pedir.

/** "Peso (kg / ton)" es un solo valor (respeta paréntesis); "Volumen (m³) /
 * Área (m²)" son dos. Una nota final tipo "— se cotiza por…" no cuenta. */
export function metricComponents(metricLabel: string): string[] {
  const [main] = metricLabel.split(" — ");
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of main) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "/" && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.filter(Boolean);
}

export function formatMaterialValues(values: Record<string, number>): string {
  return Object.entries(values)
    .map(([label, value]) => `${label}: ${value}`)
    .join(", ");
}
