// Exportar / importar expedientes e historial en Excel (.xlsx) y PDF.
// Los .xlsx sirven para respaldo y para volver a importar; los .pdf son sólo
// para leer o imprimir.

import writeXlsxFile from "write-excel-file/browser";
import readXlsxFile from "read-excel-file/browser";
import { jsPDF } from "jspdf";
import { isoDay } from "./format";
import { formatMoney, parseMoney } from "./money";
import { formatMaterialValues } from "./materials";
import { SYSTEM_VERSION } from "./version";
import type { ActivityEvent, Project, RawTask, TaskMaterial } from "./types";

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

/** Una fila por material de cada tarea: [tarea, categoría, material, cantidad, valores]. */
function materialRows(project: Project): (string | number)[][] {
  return taskRows(project).flatMap((t) =>
    ((t.taskMaterials ?? []) as TaskMaterial[]).map((tm) => [
      S(t.name ?? ""),
      tm.material.category,
      tm.material.name,
      tm.quantity,
      formatMaterialValues(tm.values ?? {}),
    ]),
  );
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

/* ── Estilo común ───────────────────────────────────────────────────────── */

const BRAND_HEX = "#5b3df5";
const BRAND_DARK_HEX = "#4a2fd0";
const BRAND_RGB: [number, number, number] = [91, 61, 245];
const INK_RGB: [number, number, number] = [20, 20, 32];
const MUTED_RGB: [number, number, number] = [110, 112, 130];
const LINE_RGB: [number, number, number] = [226, 228, 238];
const TINT_RGB: [number, number, number] = [243, 242, 255];
const ZEBRA_RGB: [number, number, number] = [249, 249, 252];
const GOOD_RGB: [number, number, number] = [15, 157, 88];

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

/* ── PDF ────────────────────────────────────────────────────────────────── */

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM = PAGE_H - 20;

type PdfCtx = { doc: jsPDF; y: number; running: string };

function pdfCover(title: string, subtitle: string): PdfCtx {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFillColor(...BRAND_RGB);
  doc.rect(0, 0, PAGE_W, 38, "F");
  doc.setFillColor(255, 255, 255);
  doc.setGState(doc.GState({ opacity: 0.12 }));
  doc.circle(PAGE_W - 18, 6, 26, "F");
  doc.circle(PAGE_W - 48, 40, 18, "F");
  doc.setGState(doc.GState({ opacity: 1 }));

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("PROJECT PLANNER", MARGIN, 12);
  doc.setFontSize(19);
  let titleLines = doc.splitTextToSize(title, CONTENT_W - 20) as string[];
  if (titleLines.length > 1) {
    // Título largo: letra más chica y dos líneas, con el subtítulo más abajo.
    doc.setFontSize(15);
    titleLines = (doc.splitTextToSize(title, CONTENT_W - 20) as string[]).slice(0, 2);
  }
  doc.text(titleLines, MARGIN, titleLines.length > 1 ? 20 : 22, { lineHeightFactor: 1.15 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(226, 222, 255);
  doc.text(subtitle, MARGIN, titleLines.length > 1 ? 34 : 30);
  doc.setTextColor(...INK_RGB);
  return { doc, y: 48, running: title };
}

function pdfNewPage(ctx: PdfCtx) {
  ctx.doc.addPage();
  ctx.doc.setFont("helvetica", "normal");
  ctx.doc.setFontSize(8);
  ctx.doc.setTextColor(...MUTED_RGB);
  ctx.doc.text(ctx.running, MARGIN, 12);
  ctx.doc.setDrawColor(...LINE_RGB);
  ctx.doc.line(MARGIN, 15, PAGE_W - MARGIN, 15);
  ctx.doc.setTextColor(...INK_RGB);
  ctx.y = 24;
}

function pdfSection(ctx: PdfCtx, label: string, count?: number) {
  if (ctx.y + 24 > BOTTOM) pdfNewPage(ctx);
  ctx.y += 4;
  ctx.doc.setFillColor(...BRAND_RGB);
  ctx.doc.roundedRect(MARGIN, ctx.y - 4.5, 1.6, 6.5, 0.8, 0.8, "F");
  ctx.doc.setFont("helvetica", "bold");
  ctx.doc.setFontSize(12);
  ctx.doc.setTextColor(...INK_RGB);
  ctx.doc.text(label, MARGIN + 4.5, ctx.y);
  if (count !== undefined) {
    const labelW = ctx.doc.getTextWidth(label);
    ctx.doc.setFont("helvetica", "normal");
    ctx.doc.setFontSize(9);
    ctx.doc.setTextColor(...MUTED_RGB);
    ctx.doc.text(`${count}`, MARGIN + 4.5 + labelW + 3, ctx.y);
  }
  ctx.doc.setTextColor(...INK_RGB);
  ctx.y += 6;
}

type PdfCol = { header: string; w: number; align?: "left" | "center" | "right" };
/** Texto, o una barra de avance (0-100) con su porcentaje. */
type PdfCellValue = string | { bar: number };

function pdfTableHeader(ctx: PdfCtx, cols: PdfCol[]) {
  const { doc } = ctx;
  doc.setFillColor(...TINT_RGB);
  doc.rect(MARGIN, ctx.y, CONTENT_W, 7.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND_RGB);
  let x = MARGIN;
  for (const col of cols) {
    const tx = col.align === "right" ? x + col.w - 2 : col.align === "center" ? x + col.w / 2 : x + 2;
    doc.text(col.header.toUpperCase(), tx, ctx.y + 5, { align: col.align ?? "left" });
    x += col.w;
  }
  doc.setTextColor(...INK_RGB);
  ctx.y += 7.5;
}

/** Tabla con filas alternadas, texto que se ajusta a su columna y cabecera que
 * se repite al cambiar de página. */
function pdfTable(ctx: PdfCtx, cols: PdfCol[], rows: PdfCellValue[][], empty = "Sin elementos.") {
  const { doc } = ctx;
  if (rows.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED_RGB);
    doc.text(empty, MARGIN + 2, ctx.y + 4);
    doc.setTextColor(...INK_RGB);
    ctx.y += 9;
    return;
  }
  if (ctx.y + 24 > BOTTOM) pdfNewPage(ctx);
  pdfTableHeader(ctx, cols);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  rows.forEach((row, index) => {
    const wrapped = row.map((cell, c) =>
      typeof cell === "string" ? (doc.splitTextToSize(cell || "-", cols[c].w - 4) as string[]) : [""],
    );
    const lines = Math.max(1, ...wrapped.map((w) => w.length));
    const h = lines * 4 + 3.5;
    if (ctx.y + h > BOTTOM) {
      pdfNewPage(ctx);
      pdfTableHeader(ctx, cols);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
    }
    if (index % 2 === 1) {
      doc.setFillColor(...ZEBRA_RGB);
      doc.rect(MARGIN, ctx.y, CONTENT_W, h, "F");
    }
    let x = MARGIN;
    row.forEach((cell, c) => {
      const col = cols[c];
      if (typeof cell === "string") {
        const tx = col.align === "right" ? x + col.w - 2 : col.align === "center" ? x + col.w / 2 : x + 2;
        doc.setTextColor(...INK_RGB);
        doc.text(wrapped[c], tx, ctx.y + 5, { align: col.align ?? "left" });
      } else {
        const bw = col.w - 16;
        const value = Math.max(0, Math.min(100, cell.bar));
        doc.setFillColor(...LINE_RGB);
        doc.roundedRect(x + 2, ctx.y + 3.2, bw, 2.2, 1.1, 1.1, "F");
        if (value > 0) {
          doc.setFillColor(...(value >= 100 ? GOOD_RGB : BRAND_RGB));
          doc.roundedRect(x + 2, ctx.y + 3.2, Math.max(2.2, (bw * value) / 100), 2.2, 1.1, 1.1, "F");
        }
        doc.setTextColor(...MUTED_RGB);
        doc.text(`${Math.round(value)}%`, x + col.w - 2, ctx.y + 5, { align: "right" });
      }
      x += col.w;
    });
    doc.setDrawColor(...LINE_RGB);
    doc.line(MARGIN, ctx.y + h, MARGIN + CONTENT_W, ctx.y + h);
    ctx.y += h;
  });
  doc.setTextColor(...INK_RGB);
  ctx.y += 2;
}

/** Tarjetas de cifras clave en fila. */
function pdfStats(ctx: PdfCtx, stats: { label: string; value: string; bar?: number }[]) {
  const { doc } = ctx;
  const gap = 4;
  const w = (CONTENT_W - gap * (stats.length - 1)) / stats.length;
  stats.forEach((stat, i) => {
    const x = MARGIN + i * (w + gap);
    doc.setFillColor(...TINT_RGB);
    doc.setDrawColor(...LINE_RGB);
    doc.roundedRect(x, ctx.y, w, 22, 2.5, 2.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED_RGB);
    doc.text(stat.label.toUpperCase(), x + 3.5, ctx.y + 6);
    doc.setFontSize(11);
    doc.setTextColor(...INK_RGB);
    const lines = (doc.splitTextToSize(stat.value, w - 7) as string[]).slice(0, 2);
    doc.text(lines, x + 3.5, ctx.y + 12.5);
    if (stat.bar !== undefined) {
      doc.setFillColor(...LINE_RGB);
      doc.roundedRect(x + 3.5, ctx.y + 17.5, w - 7, 2, 1, 1, "F");
      doc.setFillColor(...BRAND_RGB);
      doc.roundedRect(x + 3.5, ctx.y + 17.5, Math.max(2, ((w - 7) * stat.bar) / 100), 2, 1, 1, "F");
    }
  });
  doc.setTextColor(...INK_RGB);
  ctx.y += 28;
}

/** Pie de todas las páginas: marca, versión y «Página X de Y». */
function pdfFooters(ctx: PdfCtx) {
  const { doc } = ctx;
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    doc.setDrawColor(...LINE_RGB);
    doc.line(MARGIN, PAGE_H - 14, PAGE_W - MARGIN, PAGE_H - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_RGB);
    doc.text(`Project Planner ${SYSTEM_VERSION}`, MARGIN, PAGE_H - 9);
    doc.text(`Página ${page} de ${total}`, PAGE_W - MARGIN, PAGE_H - 9, { align: "right" });
  }
}

const today = () => new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

export function exportProjectPdf(project: Project) {
  const ctx = pdfCover(project.name, `Expediente · exportado el ${today()}`);
  pdfStats(ctx, [
    { label: "Responsable", value: project.ownerName },
    { label: "Presupuesto", value: formatMoney(project.budget) },
    { label: "Periodo", value: `${isoDay(project.startDate)} a ${isoDay(project.endDate)}` },
    { label: "Avance general", value: `${project.progress}%`, bar: project.progress },
  ]);

  const tasks = taskRows(project);
  pdfSection(ctx, "Tareas", tasks.length);
  pdfTable(
    ctx,
    [
      { header: "Tarea", w: 56 },
      { header: "Área", w: 30 },
      { header: "Inicio", w: 22, align: "center" },
      { header: "Término", w: 22, align: "center" },
      { header: "Avance", w: 52 },
    ],
    tasks.map((t) => [
      S(t.name ?? ""),
      S((t.technicalArea as { name?: string } | undefined)?.name ?? ""),
      isoDay(S(t.startDate ?? "")),
      isoDay(S(t.endDate ?? "")),
      { bar: Number(t.progress ?? 0) },
    ]),
    "Este expediente todavía no tiene tareas.",
  );

  const materials = materialRows(project);
  pdfSection(ctx, "Materiales", materials.length);
  pdfTable(
    ctx,
    [
      { header: "Tarea", w: 40 },
      { header: "Material", w: 56 },
      { header: "Categoría", w: 30 },
      { header: "Cant.", w: 16, align: "right" },
      { header: "Valores", w: 40 },
    ],
    materials.map((m) => [S(m[0]), S(m[2]), S(m[1]), S(m[3]), S(m[4])]),
    "Ninguna tarea tiene materiales.",
  );

  const team = project.teamMembers ?? [];
  pdfSection(ctx, "Equipo", team.length);
  pdfTable(
    ctx,
    [
      { header: "Nombre", w: 120 },
      { header: "Estado", w: 62 },
    ],
    team.map((p) => [p.name, p.teamStatus?.type ?? ""]),
    "Sin participantes.",
  );

  const milestones = project.milestones ?? [];
  pdfSection(ctx, "Hitos", milestones.length);
  pdfTable(
    ctx,
    [
      { header: "Fecha", w: 32, align: "center" },
      { header: "Descripción", w: 150 },
    ],
    milestones.map((m) => [isoDay(m.date), m.description]),
    "Sin hitos.",
  );

  pdfFooters(ctx);
  ctx.doc.save(`Expediente_${slug(project.name)}.pdf`);
}

export function exportActivityPdf(project: Project, events: ActivityEvent[]) {
  const ctx = pdfCover(
    `Historial · ${project.name}`,
    `${events.length} ${events.length === 1 ? "suceso" : "sucesos"} · exportado el ${today()}`,
  );
  pdfTable(
    ctx,
    [
      { header: "Fecha y hora", w: 32 },
      { header: "Actor", w: 30 },
      { header: "Suceso", w: 120 },
    ],
    events.map((e) => {
      const d = new Date(e.createdAt);
      const changes = (e.changes ?? []).map((c) => `   ${c.label}: ${c.from} -> ${c.to}`);
      return [
        `${isoDay(e.createdAt)}\n${d.toLocaleTimeString("es-MX", { hour12: false })}`,
        e.actor,
        [e.summary, ...changes].join("\n"),
      ];
    }),
    "Sin sucesos registrados.",
  );
  pdfFooters(ctx);
  ctx.doc.save(`Historial_${slug(project.name)}.pdf`);
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
