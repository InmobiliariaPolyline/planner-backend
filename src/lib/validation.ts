export function cleanText(value: unknown, field: string, required = true): string | undefined {
  if (value === undefined || value === null || value === '') {
    if (required) throw new Error(`${field} es obligatorio`);
    return undefined;
  }
  if (typeof value !== 'string' || value.length > 300 || /[<>]/.test(value)) {
    throw new Error(`${field} contiene un valor inválido`);
  }
  return value.trim();
}

export function requiredDate(value: unknown, field: string): Date {
  const date = new Date(String(value));
  if (!value || Number.isNaN(date.getTime())) throw new Error(`${field} debe ser una fecha válida`);
  return date;
}

export function requiredNumber(value: unknown, field: string, minimum = 0, maximum?: number): number {
  const number = Number(value);
  if (value === undefined || value === null || !Number.isFinite(number) || number < minimum || (maximum !== undefined && number > maximum)) {
    throw new Error(`${field} debe ser un número válido`);
  }
  return number;
}
