// Utilidades de formato puras (sin estado, sin efectos).

const DAY_MS = 86_400_000;

export function toISO(value: unknown): string {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function shortDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso)
    .toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
    .replace(".", "");
}

export function isoDay(value: string): string {
  return value ? value.slice(0, 10) : "";
}

export function dateRange(startISO: string, endISO: string): string {
  return `${isoDay(startISO)} — ${isoDay(endISO)}`;
}

export function currency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "—"
  );
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function periodLabel(date = new Date()): string {
  return date
    .toLocaleDateString("es-MX", { month: "long", year: "numeric" })
    .toUpperCase();
}

/** Etiquetas equidistantes para la cabecera del cronograma. */
export function timelineColumns(rangeStart: number, rangeEnd: number, count = 4): string[] {
  return Array.from({ length: count }, (_, index) => {
    const time = rangeStart + ((rangeEnd - rangeStart) * index) / (count - 1);
    return new Date(time)
      .toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
      .replace(".", "")
      .toUpperCase();
  });
}

export function fallbackRange(): [number, number] {
  const start = Date.parse("2026-01-01T00:00:00Z");
  return [start, start + 28 * DAY_MS];
}
