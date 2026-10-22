// Exportar / importar expedientes e historial en Excel (.xlsx) y PDF.
// Los .xlsx sirven para respaldo y para volver a importar; los .pdf son sólo
// para leer o imprimir.

import writeXlsxFile from "write-excel-file/browser";
import readXlsxFile from "read-excel-file/browser";
import { isoDay } from "./format";
import { formatMoney, parseMoney } from "./money";
import { materialRows, slug, taskRows } from "./exportShared";

export { exportActivityPdf, exportProjectPdf } from "./pdfReport";
import type { ActivityEvent, Project } from "./types";

const DIACRITICS = /[̀-ͯ]/g;
const S = String;

function norm(text: unknown): string {
  return S(text ?? "").normalize("NFD").replace(DIACRITICS, "").toLowerCase().trim();
}

function toDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = S(value ?? "").trim();
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? s.slice(0, 10) : parsed.toISOString().slice(0, 10);
}

/* ── Estilo común ───────────────────────────────────────────────────────── */

const BRAND_HEX = "#5b3df5";
const BRAND_DARK_HEX = "#4a2fd0";

/* ── Excel: escribir ────────────────────────────────────────────────────── */

type Cell = string | number | boolean | null;
type StyledCell = Record<string, unknown>;
type SheetInput = {
  sheet: string;
  data: StyledCell[][];
  columns: { width: number }[];
  stickyRowsCount: number;
};

type Col = { header: string; width: number; align?: "left" | "center" | "right" };

/** Hoja con estilo: cabecera de color fija, filas alternadas, bordes finos y
 * columnas con ancho propio. La cabecera sigue en la fila 1 con los mismos
 * textos de siempre para que el importador la lea igual. `percentCol` marca
 * una columna de avance (0-100) que se muestra como «45 %». */
function styledSheet(sheet: string, cols: Col[], rows: Cell[][], percentCol = -1): SheetInput {
  const header: StyledCell[] = cols.map((col) => ({
    value: col.header,
    fontWeight: "bold",
    textColor: "#ffffff",
    backgroundColor: BRAND_HEX,
    align: col.align ?? "left",
    alignVertical: "center",
    borderColor: BRAND_DARK_HEX,
    borderStyle: "thin",
    height: 26,
  }));
  const body = rows.map((row, r) =>
    cols.map((col, c): StyledCell => {
      const raw = row[c] ?? "";
      const isPercent = c === percentCol && typeof raw === "number";
      const done = isPercent && (raw as number) >= 100;
      return {
        value: raw === "" ? "" : raw,
        ...(isPercent ? { format: '0"%"' } : {}),
        ...(typeof raw === "number" ? { type: Number } : {}),
        align: isPercent ? "center" : (col.align ?? "left"),
        alignVertical: "top",
        wrap: true,
        backgroundColor: r % 2 === 1 ? "#f7f7fb" : "#ffffff",
        borderColor: "#e2e4ee",
        borderStyle: "thin",
        ...(done ? { textColor: "#0f9d58", fontWeight: "bold" } : {}),
      };
    }),
  );
  return {
    sheet,
    data: [header, ...body],
    columns: cols.map((col) => ({ width: col.width })),
    stickyRowsCount: 1,
  };
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function saveXlsx(sheets: SheetInput[], fileName: string) {
  // La librería tipa las celdas con su propio tipo; nuestros valores planos son
  // compatibles en tiempo de ejecución. Devuelve un objeto con toBlob()/toFile().
  const blob = await (writeXlsxFile(sheets as never) as unknown as { toBlob: () => Promise<Blob> }).toBlob();
  download(blob, fileName);
}

export async function exportProjectExcel(project: Project) {
  const expediente = styledSheet(
    "Expediente",
    [
      { header: "Nombre", width: 36 },
      { header: "Responsable", width: 26 },
      { header: "Presupuesto", width: 18, align: "right" },
      { header: "Inicio", width: 13, align: "center" },
      { header: "Término", width: 13, align: "center" },
      { header: "Avance %", width: 11, align: "center" },
    ],
    [[project.name, project.ownerName, formatMoney(project.budget), isoDay(project.startDate), isoDay(project.endDate), project.progress]],
    5,
  );
  const tareas = styledSheet(
    "Tareas",
    [
      { header: "Nombre", width: 36 },
      { header: "Área técnica", width: 22 },
      { header: "Responsable", width: 24 },
      { header: "Inicio", width: 13, align: "center" },
      { header: "Término", width: 13, align: "center" },
      { header: "Avance %", width: 11, align: "center" },
      { header: "Fase", width: 8, align: "center" },
      { header: "Depende de", width: 20 },
    ],
    taskRows(project).map((t) => [
      S(t.name ?? ""),
      S((t.technicalArea as { name?: string } | undefined)?.name ?? ""),
      S(t.ownerName ?? ""),
      isoDay(S(t.startDate ?? "")),
      isoDay(S(t.endDate ?? "")),
      Number(t.progress ?? 0),
      t.isPhase ? "Sí" : "No",
      S(t.dependency ?? ""),
    ]),
    5,
  );
  const materiales = styledSheet(
    "Materiales",
    [
      { header: "Tarea", width: 32 },
      { header: "Categoría", width: 24 },
      { header: "Material", width: 36 },
      { header: "Cantidad", width: 12, align: "right" },
      { header: "Valores de la métrica", width: 40 },
    ],
    materialRows(project),
  );
  const hitos = styledSheet(
    "Hitos",
    [
      { header: "Descripción", width: 50 },
      { header: "Fecha", width: 14, align: "center" },
    ],
    (project.milestones ?? []).map((m) => [m.description, isoDay(m.date)]),
  );
  const equipo = styledSheet(
    "Equipo",
    [
      { header: "Nombre", width: 34 },
      { header: "Estado", width: 18 },
    ],
    (project.teamMembers ?? []).map((p) => [p.name, p.teamStatus?.type ?? ""]),
  );

  await saveXlsx([expediente, tareas, materiales, hitos, equipo], `Expediente_${slug(project.name)}.xlsx`);
}

export async function exportActivityExcel(project: Project, events: ActivityEvent[]) {
  const historial = styledSheet(
    "Historial",
    [
      { header: "Fecha", width: 13, align: "center" },
      { header: "Hora", width: 10, align: "center" },
      { header: "Actor", width: 22 },
      { header: "Acción", width: 18 },
      { header: "Entidad", width: 14 },
      { header: "Objeto", width: 28 },
      { header: "Resumen", width: 64 },
      { header: "Cambios", width: 42 },
      { header: "ISO", width: 26 },
    ],
    events.map((e) => {
      const d = new Date(e.createdAt);
      return [
        isoDay(e.createdAt),
        d.toLocaleTimeString("es-MX", { hour12: false }),
        e.actor,
        e.action,
        e.entity,
        e.target ?? "",
        e.summary,
        e.changes && e.changes.length ? JSON.stringify(e.changes) : "",
        e.createdAt,
      ];
    }),
  );
  await saveXlsx([historial], `Historial_${slug(project.name)}.xlsx`);
}

/* ── Excel: leer ────────────────────────────────────────────────────────── */

type ObjRow = Record<string, unknown>;
type ReadSheet = { sheet: string; data: unknown[][] };

let cachedFile: File | null = null;
let cachedSheets: ReadSheet[] = [];

/** Lee (una vez por archivo) todas las hojas del .xlsx. */
async function allSheets(file: File): Promise<ReadSheet[]> {
  if (cachedFile === file) return cachedSheets;
  try {
    cachedSheets = (await readXlsxFile(file)) as unknown as ReadSheet[];
  } catch {
    cachedSheets = [];
  }
  cachedFile = file;
  return cachedSheets;
}

/** Filas de una hoja (por nombre, sin distinguir acentos) como objetos por cabecera. */
async function sheetObjects(file: File, name: string, fallbackFirst = false): Promise<ObjRow[]> {
  const sheets = await allSheets(file);
  const target = norm(name);
  const sheet =
    sheets.find((s) => norm(s.sheet) === target) ?? (fallbackFirst ? sheets[0] : undefined);
  const rows = sheet?.data;
  if (!Array.isArray(rows) || rows.length < 2) return [];
  const headers = (rows[0] as unknown[]).map((h) => norm(h));
  return rows.slice(1).map((cells) => {
    const obj: ObjRow = {};
    headers.forEach((h, i) => {
      obj[h] = (cells as unknown[])[i];
    });
    return obj;
  });
}

function pick(row: ObjRow, ...aliases: string[]): string {
  for (const alias of aliases) {
    const value = row[norm(alias)];
    if (value !== undefined && value !== null && S(value).trim() !== "") return S(value).trim();
  }
  return "";
}

export type ProjectImport = {
  project: { name: string; startDate: string; endDate: string; budget: number; ownerName: string };
  tasks: {
    name: string;
    technicalArea: string;
    ownerName: string;
    startDate: string;
    endDate: string;
    progress: number;
    isPhase: boolean;
    dependency: string;
    materials: { category: string; name: string; quantity: number; values: Record<string, number> }[];
  }[];
  milestones: { description: string; date: string }[];
  teamMembers: { name: string; teamStatus: string }[];
};

/** Inverso de formatMaterialValues: "Peso (kg): 120, Longitud (m): 5" -> { ... }. */
function parseMetricValues(text: string): Record<string, number> {
  const values: Record<string, number> = {};
  for (const [, label, number] of text.matchAll(/([^:,]+?):\s*(-?\d+(?:[.,]\d+)?)\s*(?:,|$)/g)) {
    values[label.trim()] = Number(number.replace(",", "."));
  }
  return values;
}

export async function parseProjectFile(file: File): Promise<ProjectImport> {
  const exp = (await sheetObjects(file, "Expediente", true))[0] ?? {};
  const project = {
    name: pick(exp, "nombre"),
    ownerName: pick(exp, "responsable"),
    budget: parseMoney(pick(exp, "presupuesto")) ?? 0,
    startDate: toDate(pick(exp, "inicio", "fecha de inicio")),
    endDate: toDate(pick(exp, "termino", "fecha de termino", "fin")),
  };
  if (!project.name || !project.startDate || !project.endDate || !project.ownerName) {
    throw new Error("La hoja «Expediente» no tiene los datos mínimos: nombre, responsable y fechas.");
  }

  const tasks = (await sheetObjects(file, "Tareas"))
    .map((r) => ({
      name: pick(r, "nombre"),
      technicalArea: pick(r, "area tecnica", "area", "tecnica"),
      ownerName: pick(r, "responsable"),
      startDate: toDate(pick(r, "inicio", "fecha de inicio")),
      endDate: toDate(pick(r, "termino", "fin")),
      progress: Number(pick(r, "avance %", "avance", "progreso")) || 0,
      isPhase: /^s[ií]|^true|^1$/i.test(pick(r, "fase", "es fase")),
      dependency: pick(r, "depende de", "dependencia"),
      materials: [] as ProjectImport["tasks"][number]["materials"],
    }))
    .filter((t) => t.name && t.technicalArea && t.startDate && t.endDate && t.ownerName);

  // Hoja opcional «Materiales»: cada fila se asigna a la primera tarea con ese
  // nombre (los respaldos anteriores no la traen y se importan igual).
  for (const r of await sheetObjects(file, "Materiales")) {
    const task = tasks.find((t) => norm(t.name) === norm(pick(r, "tarea")));
    const quantity = Number(pick(r, "cantidad").replace(",", "."));
    if (!task || !pick(r, "categoria") || !pick(r, "material") || !Number.isFinite(quantity)) continue;
    task.materials.push({
      category: pick(r, "categoria"),
      name: pick(r, "material"),
      quantity,
      values: parseMetricValues(pick(r, "valores de la metrica", "valores")),
    });
  }

  const milestones = (await sheetObjects(file, "Hitos"))
    .map((r) => ({ description: pick(r, "descripcion"), date: toDate(pick(r, "fecha")) }))
    .filter((m) => m.description && m.date);

  const teamMembers = (await sheetObjects(file, "Equipo"))
    .map((r) => ({ name: pick(r, "nombre"), teamStatus: pick(r, "estado") }))
    .filter((m) => m.name && m.teamStatus);

  return { project, tasks, milestones, teamMembers };
}

export type ActivityImportRow = {
  createdAt: string;
  actor: string;
  action: string;
  entity: string;
  target: string;
  summary: string;
  tone: string;
  changes?: unknown;
};

export async function parseActivityFile(file: File): Promise<ActivityImportRow[]> {
  const rows = await sheetObjects(file, "Historial", true);
  return rows
    .map((r) => {
      const iso = pick(r, "iso");
      const fecha = pick(r, "fecha");
      const hora = pick(r, "hora");
      const createdAt = iso || (fecha ? `${toDate(fecha)}T${hora || "00:00:00"}` : "");
      let changes: unknown;
      const rawChanges = pick(r, "cambios");
      if (rawChanges) {
        try {
          changes = JSON.parse(rawChanges);
        } catch {
          changes = undefined;
        }
      }
      return {
        createdAt,
        actor: pick(r, "actor") || "Administrador",
        action: pick(r, "accion") || "import",
        entity: pick(r, "entidad") || "—",
        target: pick(r, "objeto"),
        summary: pick(r, "resumen"),
        tone: pick(r, "tono") || "neutral",
        changes,
      };
    })
    .filter((r) => r.createdAt && r.summary);
}
