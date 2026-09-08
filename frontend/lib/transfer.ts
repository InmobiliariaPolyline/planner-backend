// Exportar / importar expedientes e historial en Excel (.xlsx) y PDF.
// Los .xlsx sirven para respaldo y para volver a importar; los .pdf son sólo
// para leer o imprimir.

import writeXlsxFile from "write-excel-file/browser";
import readXlsxFile from "read-excel-file/browser";
import { jsPDF } from "jspdf";
import { isoDay } from "./format";
import { formatMoney, parseMoney } from "./money";
import type { ActivityEvent, Project, RawTask } from "./types";

const DIACRITICS = /[̀-ͯ]/g;
const S = String;

function slug(text: string): string {
  const base = (text || "expediente")
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || "expediente";
}

function norm(text: unknown): string {
  return S(text ?? "").normalize("NFD").replace(DIACRITICS, "").toLowerCase().trim();
}

function taskRows(project: Project): RawTask[] {
  return (project.tasks ?? []) as RawTask[];
}

function toDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = S(value ?? "").trim();
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? s.slice(0, 10) : parsed.toISOString().slice(0, 10);
}

/* ── Excel: escribir ────────────────────────────────────────────────────── */

type Cell = string | number | boolean | null;
type Grid = Cell[][];
type SheetInput = { sheet: string; data: Grid };

function grid(headers: string[], rows: Cell[][]): Grid {
  return [headers, ...rows];
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
  const expediente = grid(
    ["Nombre", "Responsable", "Presupuesto", "Inicio", "Término", "Avance %"],
    [[project.name, project.ownerName, formatMoney(project.budget), isoDay(project.startDate), isoDay(project.endDate), project.progress]],
  );
  const tareas = grid(
    ["Nombre", "Área técnica", "Responsable", "Inicio", "Término", "Avance %", "Fase", "Depende de"],
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
  );
  const hitos = grid(
    ["Descripción", "Fecha"],
    (project.milestones ?? []).map((m) => [m.description, isoDay(m.date)]),
  );
  const equipo = grid(
    ["Nombre", "Estado"],
    (project.teamMembers ?? []).map((p) => [p.name, p.teamStatus?.type ?? ""]),
  );

  await saveXlsx(
    [
      { sheet: "Expediente", data: expediente },
      { sheet: "Tareas", data: tareas },
      { sheet: "Hitos", data: hitos },
      { sheet: "Equipo", data: equipo },
    ],
    `Expediente_${slug(project.name)}.xlsx`,
  );
}

export async function exportActivityExcel(project: Project, events: ActivityEvent[]) {
  const data = grid(
    ["Fecha", "Hora", "Actor", "Acción", "Entidad", "Objeto", "Resumen", "Cambios", "ISO"],
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
  await saveXlsx([{ sheet: "Historial", data }], `Historial_${slug(project.name)}.xlsx`);
}

/* ── PDF ────────────────────────────────────────────────────────────────── */

function pdfHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(subtitle, 14, 25);
  doc.setDrawColor(220);
  doc.line(14, 29, 196, 29);
  doc.setTextColor(40);
}

function pdfLines(doc: jsPDF, lines: string[], startY: number): number {
  let y = startY;
  doc.setFontSize(10);
  for (const raw of lines) {
    for (const line of doc.splitTextToSize(raw, 180) as string[]) {
      if (y > 284) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 14, y);
      y += 6;
    }
  }
  return y;
}

export function exportProjectPdf(project: Project) {
  const doc = new jsPDF();
  pdfHeader(doc, project.name, `Expediente · exportado el ${new Date().toLocaleDateString("es-MX")}`);
  let y = pdfLines(
    doc,
    [
      `Responsable: ${project.ownerName}`,
      `Presupuesto: ${formatMoney(project.budget)}`,
      `Periodo: ${isoDay(project.startDate)} - ${isoDay(project.endDate)} (${project.durationMonths} meses)`,
      `Avance general: ${project.progress}%`,
    ],
    38,
  );

  const block = (label: string, items: string[]) => {
    y += 4;
    doc.setFontSize(12);
    if (y > 278) {
      doc.addPage();
      y = 20;
    }
    doc.text(label, 14, y);
    y = pdfLines(doc, items.length ? items : ["(ninguno)"], y + 7);
  };

  block(
    `Tareas (${taskRows(project).length})`,
    taskRows(project).map(
      (t) =>
        `• ${S(t.name)} - ${S((t.technicalArea as { name?: string } | undefined)?.name ?? "")} · ${isoDay(S(t.startDate ?? ""))} -> ${isoDay(S(t.endDate ?? ""))} · ${Number(t.progress ?? 0)}%`,
    ),
  );
  block(
    `Equipo (${(project.teamMembers ?? []).length})`,
    (project.teamMembers ?? []).map((p) => `• ${p.name} - ${p.teamStatus?.type ?? ""}`),
  );
  block(
    `Hitos (${(project.milestones ?? []).length})`,
    (project.milestones ?? []).map((m) => `• ${isoDay(m.date)} - ${m.description}`),
  );

  doc.save(`Expediente_${slug(project.name)}.pdf`);
}

export function exportActivityPdf(project: Project, events: ActivityEvent[]) {
  const doc = new jsPDF();
  pdfHeader(
    doc,
    `Historial · ${project.name}`,
    `${events.length} sucesos · exportado el ${new Date().toLocaleDateString("es-MX")}`,
  );
  const lines: string[] = [];
  for (const e of events) {
    const d = new Date(e.createdAt);
    lines.push(`${isoDay(e.createdAt)} ${d.toLocaleTimeString("es-MX", { hour12: false })} · ${e.actor}`);
    lines.push(`   ${e.summary}`);
    for (const c of e.changes ?? []) lines.push(`     ${c.label}: ${c.from} -> ${c.to}`);
    lines.push("");
  }
  pdfLines(doc, lines.length ? lines : ["Sin sucesos registrados."], 38);
  doc.save(`Historial_${slug(project.name)}.pdf`);
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
  }[];
  milestones: { description: string; date: string }[];
  teamMembers: { name: string; teamStatus: string }[];
};

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
    }))
    .filter((t) => t.name && t.technicalArea && t.startDate && t.endDate && t.ownerName);

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
