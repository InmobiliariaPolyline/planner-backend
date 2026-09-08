// Entrada flexible de importes: acepta "15000", "15.000", "15,000.50",
// "15.000,50", "15.000.00"… y devuelve el número. El separador decimal es el
// último "." o "," siempre que le sigan 1 o 2 dígitos; el resto son separadores
// de miles y se ignoran.

export function parseMoney(input: string | number | null | undefined): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  const cleaned = String(input ?? "").replace(/[^\d.,-]/g, "").trim();
  if (!cleaned || cleaned === "-") return null;

  const negative = cleaned.startsWith("-");
  const body = cleaned.replace(/-/g, "");
  const lastSep = Math.max(body.lastIndexOf("."), body.lastIndexOf(","));

  let intPart = body;
  let fracPart = "";
  if (lastSep !== -1) {
    const decimals = body.length - lastSep - 1;
    if (decimals >= 1 && decimals <= 2) {
      intPart = body.slice(0, lastSep);
      fracPart = body.slice(lastSep + 1);
    }
  }
  intPart = intPart.replace(/[.,]/g, "");
  fracPart = fracPart.replace(/[.,]/g, "");
  if (!intPart && !fracPart) return null;

  const num = Number(`${intPart || "0"}.${fracPart || "0"}`);
  if (!Number.isFinite(num)) return null;
  return negative ? -num : num;
}

/** "15000" -> "15.000" · "15000.5" -> "15.000,50" (formato es, sin símbolo). */
export function formatMoney(value: string | number): string {
  const num = parseMoney(value);
  if (num === null) return typeof value === "string" ? value : "";
  const cents = Math.round(Math.abs(num) * 100) % 100;
  return num.toLocaleString("es", {
    minimumFractionDigits: cents === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
