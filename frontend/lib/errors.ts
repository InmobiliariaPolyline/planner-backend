// Traduce errores (del backend o del navegador) a un mensaje claro en español,
// sin jerga técnica. Si no se reconoce, se devuelve un texto genérico.

const RULES: { match: RegExp; message: string }[] = [
  { match: /no fue posible conectar|failed to fetch|networkerror|load failed/i,
    message: "No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo." },
  { match: /api no disponible|502|503|504|arranc/i,
    message: "El servidor está iniciándose. Espera unos segundos y vuelve a intentarlo." },
  { match: /endDate.*anterior.*startDate|no puede ser anterior a la fecha de inicio/i,
    message: "La fecha de término no puede ser anterior a la de inicio." },
  { match: /es obligatorio/i,
    message: "Falta rellenar un campo obligatorio." },
  { match: /contiene un valor inválido|símbolos? < o >|< >/i,
    message: "Hay un campo con caracteres no permitidos (< o >) o demasiado largo." },
  { match: /debe ser una fecha válida/i,
    message: "Hay una fecha con formato incorrecto." },
  { match: /debe ser un número válido/i,
    message: "Hay un importe o número con formato incorrecto." },
  { match: /http.*válida|empezar por http/i,
    message: "El enlace debe empezar por http:// o https://." },
  { match: /no se puede eliminar.*tarea/i,
    message: "No se puede eliminar: hay tareas que usan esta área técnica." },
  { match: /no se puede eliminar.*participante/i,
    message: "No se puede eliminar: hay participantes con este estado." },
  { match: /no encontrad[oa]|not found/i,
    message: "El elemento ya no existe. Actualiza la página." },
  { match: /solo lectura|403/i,
    message: "Este enlace es de solo lectura; no permite cambios." },
  { match: /410|ya no es válido|fue eliminado del sistema/i,
    message: "El enlace ya no funciona o el expediente fue eliminado." },
  { match: /429|demasiadas peticiones|too many/i,
    message: "Demasiadas acciones seguidas. Espera un momento y reintenta." },
];

export function friendlyError(error: unknown): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  for (const rule of RULES) {
    if (rule.match.test(raw)) return rule.message;
  }
  // Mensajes cortos y legibles del backend se muestran tal cual.
  if (raw && raw.length < 120 && !/[{}[\]<>]|error:|stack|prisma|econn/i.test(raw)) return raw;
  return "No se pudo completar la acción. Inténtalo de nuevo en un momento.";
}
