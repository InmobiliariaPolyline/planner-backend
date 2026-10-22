// Informes en PDF del expediente y de su historial. El diseño sigue el de la
// interfaz: acento violeta, tarjetas con filete de color, mucho aire y gráficos
// dibujados como vectores (anillo de estado, cronograma, barras de avance).

import { jsPDF } from "jspdf";
import { materialRows, slug, taskRows } from "./exportShared";
import { isoDay } from "./format";
import { formatMoney } from "./money";
import type { ActivityEvent, Project } from "./types";
import { SYSTEM_VERSION } from "./version";

type RGB = [number, number, number];

const BRAND: RGB = [91, 61, 245];
const BRAND_SOFT: RGB = [226, 221, 253];
const INK: RGB = [20, 20, 32];
const MUTED: RGB = [112, 114, 132];
const LINE: RGB = [228, 229, 238];
const TINT: RGB = [244, 243, 255];
const ZEBRA: RGB = [250, 250, 253];
const GOOD: RGB = [15, 157, 88];
const WARN: RGB = [217, 119, 6];
const BAD: RGB = [220, 38, 38];

const PAGE_W = 210;
const PAGE_H = 297;
const M = 14;
const CW = PAGE_W - M * 2;
const BOTTOM = PAGE_H - 20;
const DAY = 86_400_000;

type Ctx = { doc: jsPDF; y: number; running: string };
type Tone = "good" | "warn" | "bad" | "brand" | "muted";

const toneColor = (tone: Tone): RGB =>
  tone === "good" ? GOOD : tone === "warn" ? WARN : tone === "bad" ? BAD : tone === "brand" ? BRAND : MUTED;

const dayMs = (value: unknown): number => {
  const ms = Date.parse(String(value ?? ""));
  return Number.isNaN(ms) ? NaN : Math.floor(ms / DAY) * DAY;
};
const todayMs = () => Math.floor(Date.now() / DAY) * DAY;
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const longDate = (ms: number) =>
  new Date(ms).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).replace(/\./g, "");
const shortDay = (ms: number) =>
  new Date(ms).toLocaleDateString("es-MX", { day: "2-digit", month: "short", timeZone: "UTC" }).replace(/\./g, "");
const exportedOn = () =>
  new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

/* ── Piezas básicas ──────────────────────────────────────────────────────── */

function fill(doc: jsPDF, c: RGB) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function stroke(doc: jsPDF, c: RGB) {
  doc.setDrawColor(c[0], c[1], c[2]);
}
function ink(doc: jsPDF, c: RGB = INK) {
  doc.setTextColor(c[0], c[1], c[2]);
}
function font(doc: jsPDF, style: "normal" | "bold" | "italic", size: number) {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
}

/** Marca de la app: cuadrado violeta con el símbolo de diana. */
function brandMark(doc: jsPDF, x: number, y: number, s: number) {
  fill(doc, BRAND);
  doc.roundedRect(x, y, s, s, s * 0.28, s * 0.28, "F");
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(s * 0.07);
  doc.circle(x + s / 2, y + s / 2, s * 0.27, "S");
  fill(doc, [255, 255, 255]);
  doc.circle(x + s / 2, y + s / 2, s * 0.09, "F");
}

function pill(doc: jsPDF, x: number, y: number, text: string, tone: Tone) {
  font(doc, "bold", 7);
  const w = doc.getTextWidth(text) + 5;
  const c = toneColor(tone);
  doc.setGState(doc.GState({ opacity: 0.14 }));
  fill(doc, c);
  doc.roundedRect(x, y, w, 5.2, 2.6, 2.6, "F");
  doc.setGState(doc.GState({ opacity: 1 }));
  ink(doc, c);
  doc.text(text, x + 2.5, y + 3.7);
  ink(doc);
  return w;
}

function ensure(ctx: Ctx, h: number) {
  if (ctx.y + h > BOTTOM) newPage(ctx);
}

function newPage(ctx: Ctx) {
  const { doc } = ctx;
  doc.addPage();
  brandMark(doc, M, 8, 6);
  font(doc, "bold", 7.5);
  ink(doc, MUTED);
  doc.text("PROJECT PLANNER", M + 8.5, 12.2, { charSpace: 0.4 });
  font(doc, "normal", 8);
  doc.text(ctx.running, PAGE_W - M, 12.2, { align: "right" });
  stroke(doc, LINE);
  doc.setLineWidth(0.2);
  doc.line(M, 17, PAGE_W - M, 17);
  ink(doc);
  ctx.y = 26;
}

function section(ctx: Ctx, label: string, count?: number, minSpace = 30) {
  ensure(ctx, minSpace);
  const { doc } = ctx;
  ctx.y += 5;
  fill(doc, BRAND);
  doc.roundedRect(M, ctx.y - 4.6, 1.6, 6.6, 0.8, 0.8, "F");
  font(doc, "bold", 12.5);
  ink(doc);
  doc.text(label, M + 4.5, ctx.y);
  if (count !== undefined) {
    const w = doc.getTextWidth(label);
    font(doc, "normal", 9);
    ink(doc, MUTED);
    doc.text(String(count), M + 4.5 + w + 3, ctx.y);
  }
  ink(doc);
  ctx.y += 7;
}

/** Cabecera de portada: marca, tipo de informe, título, logotipo y metadatos. */
function cover(project: Project, kind: string, title: string, meta: string[]): Ctx {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  brandMark(doc, M, 12, 9);
  font(doc, "bold", 8.5);
  ink(doc, INK);
  doc.text("PROJECT PLANNER", M + 12, 17.8, { charSpace: 0.5 });
  font(doc, "normal", 8.5);
  ink(doc, MUTED);
  doc.text(`${kind} · ${exportedOn()}`, PAGE_W - M, 17.8, { align: "right" });
  stroke(doc, LINE);
  doc.setLineWidth(0.2);
  doc.line(M, 26, PAGE_W - M, 26);

  let logoW = 0;
  if (project.logoUrl) {
    try {
      const format = /^data:image\/(png|jpe?g|webp)/i.exec(project.logoUrl)?.[1]?.toUpperCase().replace("JPG", "JPEG");
      if (format) {
        logoW = 26;
        stroke(doc, LINE);
        doc.roundedRect(PAGE_W - M - logoW, 33, logoW, logoW, 3, 3, "S");
        doc.addImage(project.logoUrl, format, PAGE_W - M - logoW + 1.5, 34.5, logoW - 3, logoW - 3);
      }
    } catch {
      logoW = 0; // logotipo ilegible: el informe sale igual, sin él
    }
  }

  font(doc, "bold", 8);
  ink(doc, BRAND);
  doc.text(kind.toUpperCase(), M, 38, { charSpace: 0.9 });
  font(doc, "bold", 24);
  ink(doc, INK);
  const lines = (doc.splitTextToSize(title, CW - (logoW ? logoW + 8 : 0)) as string[]).slice(0, 3);
  doc.text(lines, M, 48, { lineHeightFactor: 1.12 });
  const titleBottom = 48 + (lines.length - 1) * 9.6;
  font(doc, "normal", 9.5);
  ink(doc, MUTED);
  doc.text(meta.join("   ·   "), M, titleBottom + 8);
  ink(doc);
  return { doc, y: Math.max(titleBottom + 16, logoW ? 66 : 0), running: project.name };
}

/** Pie de todas las páginas. */
function footers(ctx: Ctx) {
  const { doc } = ctx;
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    stroke(doc, LINE);
    doc.setLineWidth(0.2);
    doc.line(M, PAGE_H - 14, PAGE_W - M, PAGE_H - 14);
    font(doc, "normal", 8);
    ink(doc, MUTED);
    doc.text(`Project Planner ${SYSTEM_VERSION}`, M, PAGE_H - 9);
    doc.text(`Página ${page} de ${total}`, PAGE_W - M, PAGE_H - 9, { align: "right" });
  }
}

/* ── Tarjetas de cifras ──────────────────────────────────────────────────── */

type Stat = { label: string; value: string; hint?: string; tone: Tone };

function statCards(ctx: Ctx, stats: Stat[]) {
  const { doc } = ctx;
  const gap = 4;
  const w = (CW - gap * (stats.length - 1)) / stats.length;
  const h = 29;
  stats.forEach((stat, i) => {
    const x = M + i * (w + gap);
    fill(doc, [255, 255, 255]);
    stroke(doc, LINE);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, ctx.y, w, h, 2.8, 2.8, "FD");
    fill(doc, toneColor(stat.tone));
    doc.roundedRect(x + 0.4, ctx.y, w - 0.8, 1.6, 0.8, 0.8, "F");
    font(doc, "bold", 6.8);
    ink(doc, MUTED);
    doc.text(stat.label.toUpperCase(), x + 4, ctx.y + 8, { charSpace: 0.5 });
    font(doc, "bold", 17);
    ink(doc, INK);
    const value = (doc.splitTextToSize(stat.value, w - 8) as string[])[0];
    doc.text(value, x + 4, ctx.y + 17.5);
    if (stat.hint) {
      font(doc, "normal", 7.5);
      ink(doc, MUTED);
      doc.text((doc.splitTextToSize(stat.hint, w - 8) as string[])[0], x + 4, ctx.y + 24);
    }
  });
  ink(doc);
  ctx.y += h + 8;
}

/* ── Anillo de estado y ritmo del proyecto ───────────────────────────────── */

function donut(doc: jsPDF, cx: number, cy: number, r: number, parts: { value: number; color: RGB }[], centerText: string) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  doc.setLineWidth(5);
  doc.setLineCap("butt");
  if (total === 0) {
    stroke(doc, LINE);
    doc.circle(cx, cy, r, "S");
  } else {
    let angle = -Math.PI / 2;
    for (const part of parts) {
      if (part.value <= 0) continue;
      const sweep = (part.value / total) * Math.PI * 2;
      const steps = Math.max(2, Math.ceil(sweep / 0.05));
      stroke(doc, part.color);
      for (let i = 0; i < steps; i++) {
        const a0 = angle + (sweep * i) / steps;
        const a1 = angle + (sweep * (i + 1)) / steps + 0.012;
        doc.line(cx + r * Math.cos(a0), cy + r * Math.sin(a0), cx + r * Math.cos(a1), cy + r * Math.sin(a1));
      }
      angle += sweep;
    }
  }
  doc.setLineWidth(0.2);
  font(doc, "bold", 17);
  ink(doc);
  doc.text(centerText, cx, cy + 2, { align: "center" });
}

function bar(doc: jsPDF, x: number, y: number, w: number, value: number, color: RGB, h = 3) {
  fill(doc, LINE);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, "F");
  if (value > 0) {
    fill(doc, color);
    doc.roundedRect(x, y, Math.max(h, (w * clamp(value)) / 100), h, h / 2, h / 2, "F");
  }
}

function overview(ctx: Ctx, project: Project) {
  const { doc } = ctx;
  const tasks = taskRows(project);
  const today = todayMs();
  const done = tasks.filter((t) => Number(t.progress ?? 0) >= 100).length;
  const notStarted = tasks.filter((t) => Number(t.progress ?? 0) <= 0).length;
  const running = tasks.length - done - notStarted;
  const late = tasks.filter((t) => Number(t.progress ?? 0) < 100 && dayMs(t.endDate) < today).length;

  const h = 52;
  const gap = 4;
  const leftW = 86;
  const rightW = CW - leftW - gap;

  // Estado de las tareas
  fill(doc, [255, 255, 255]);
  stroke(doc, LINE);
  doc.setLineWidth(0.25);
  doc.roundedRect(M, ctx.y, leftW, h, 2.8, 2.8, "FD");
  font(doc, "bold", 6.8);
  ink(doc, MUTED);
  doc.text("ESTADO DE LAS TAREAS", M + 4, ctx.y + 7, { charSpace: 0.5 });
  const parts = [
    { value: done, color: GOOD, label: "Completadas" },
    { value: running, color: BRAND, label: "En curso" },
    { value: notStarted, color: [190, 192, 206] as RGB, label: "Sin iniciar" },
  ];
  donut(doc, M + 24, ctx.y + 30, 14, parts, `${tasks.length}`);
  font(doc, "normal", 6.5);
  ink(doc, MUTED);
  doc.text(tasks.length === 1 ? "tarea" : "tareas", M + 24, ctx.y + 36.5, { align: "center" });
  parts.forEach((p, i) => {
    const ly = ctx.y + 19 + i * 8;
    fill(doc, p.color);
    doc.roundedRect(M + 46, ly - 2.6, 3.4, 3.4, 1, 1, "F");
    font(doc, "normal", 8.5);
    ink(doc, INK);
    doc.text(p.label, M + 52, ly);
    font(doc, "bold", 8.5);
    doc.text(String(p.value), M + leftW - 5, ly, { align: "right" });
  });
  if (late > 0) {
    font(doc, "bold", 7.5);
    ink(doc, BAD);
    doc.text(`${late} ${late === 1 ? "atrasada" : "atrasadas"}`, M + 46, ctx.y + 46);
  }

  // Ritmo del proyecto
  const rx = M + leftW + gap;
  fill(doc, [255, 255, 255]);
  stroke(doc, LINE);
  doc.roundedRect(rx, ctx.y, rightW, h, 2.8, 2.8, "FD");
  font(doc, "bold", 6.8);
  ink(doc, MUTED);
  doc.text("RITMO DEL PROYECTO", rx + 4, ctx.y + 7, { charSpace: 0.5 });
  const start = dayMs(project.startDate);
  const end = dayMs(project.endDate);
  const elapsed = Number.isFinite(start) && end > start ? clamp(((today - start) / (end - start)) * 100) : 0;
  const progress = clamp(project.progress);
  const bw = rightW - 8;

  font(doc, "normal", 8.5);
  ink(doc, INK);
  doc.text("Tiempo transcurrido", rx + 4, ctx.y + 16);
  font(doc, "bold", 8.5);
  doc.text(`${Math.round(elapsed)}%`, rx + rightW - 4, ctx.y + 16, { align: "right" });
  bar(doc, rx + 4, ctx.y + 18.5, bw, elapsed, [150, 152, 170]);

  font(doc, "normal", 8.5);
  doc.text("Avance real", rx + 4, ctx.y + 28);
  font(doc, "bold", 8.5);
  doc.text(`${Math.round(progress)}%`, rx + rightW - 4, ctx.y + 28, { align: "right" });
  bar(doc, rx + 4, ctx.y + 30.5, bw, progress, progress >= 100 ? GOOD : BRAND);

  let verdict: { text: string; tone: Tone };
  if (progress >= 100) verdict = { text: "Proyecto completado", tone: "good" };
  else if (today > end) verdict = { text: `Plazo vencido hace ${Math.max(1, Math.round((today - end) / DAY))} días`, tone: "bad" };
  else if (progress + 5 >= elapsed) verdict = { text: "Al ritmo previsto", tone: "good" };
  else verdict = { text: "Por debajo del ritmo previsto", tone: "warn" };
  pill(doc, rx + 4, ctx.y + 40, verdict.text, verdict.tone);
  if (Number.isFinite(end) && today <= end && progress < 100) {
    font(doc, "normal", 7.5);
    ink(doc, MUTED);
    doc.text(`${Math.round((end - today) / DAY)} días restantes`, rx + rightW - 4, ctx.y + 43.7, { align: "right" });
  }
  ink(doc);
  ctx.y += h + 6;
}

/* ── Cronograma (Gantt) ──────────────────────────────────────────────────── */

function gantt(ctx: Ctx, project: Project) {
  const tasks = taskRows(project);
  const { doc } = ctx;
  section(ctx, "Cronograma", tasks.length, 50);
  if (tasks.length === 0) {
    font(doc, "italic", 9);
    ink(doc, MUTED);
    doc.text("Este expediente todavía no tiene tareas.", M + 2, ctx.y + 4);
    ink(doc);
    ctx.y += 10;
    return;
  }

  // leyenda a la derecha del título de la sección
  {
    let lx = PAGE_W - M;
    const items: [string, RGB][] = [["Atrasada", BAD], ["En curso", BRAND], ["Completada", GOOD]];
    font(doc, "normal", 7.5);
    for (const [label, color] of items) {
      const w = doc.getTextWidth(label);
      ink(doc, MUTED);
      doc.text(label, lx - w, ctx.y - 3.4);
      fill(doc, color);
      doc.roundedRect(lx - w - 8, ctx.y - 5.6, 6, 2.8, 1.4, 1.4, "F");
      lx -= w + 8 + 6;
    }
    ink(doc);
  }

  const starts = tasks.map((t) => dayMs(t.startDate)).filter(Number.isFinite);
  const ends = tasks.map((t) => dayMs(t.endDate)).filter(Number.isFinite);
  const t0 = Math.min(dayMs(project.startDate), ...starts);
  const t1 = Math.max(dayMs(project.endDate), ...ends);
  const span = Math.max(DAY, t1 - t0);
  const nameW = 50;
  const cx = M + nameW;
  const cw = CW - nameW;
  const xOf = (ms: number) => cx + ((ms - t0) / span) * cw;
  const rowH = 7.2;
  const today = todayMs();

  // meses del eje
  const months: { x: number; label: string }[] = [];
  const first = new Date(t0);
  let cursor = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1);
  while (cursor <= t1) {
    months.push({
      x: xOf(Math.max(cursor, t0)),
      label: new Date(cursor).toLocaleDateString("es-MX", { month: "short", year: "2-digit", timeZone: "UTC" }).replace(/\./g, ""),
    });
    const d = new Date(cursor);
    cursor = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  }
  // si hay demasiados meses se muestran alternos para que no se pisen
  const every = months.length > 14 ? 3 : months.length > 8 ? 2 : 1;

  const header = () => {
    fill(doc, TINT);
    doc.rect(M, ctx.y, CW, 8, "F");
    font(doc, "bold", 7);
    ink(doc, BRAND);
    doc.text("TAREA", M + 2, ctx.y + 5.3, { charSpace: 0.4 });
    months.forEach((m, i) => {
      if (i % every === 0) doc.text(m.label.toUpperCase(), m.x + 1, ctx.y + 5.3);
    });
    ink(doc);
    ctx.y += 8;
  };

  const rowsTop = () => ctx.y;
  header();
  let top = rowsTop();
  let rowsOnPage = 0;

  const closePage = (bottom: number) => {
    // cuadrícula de meses y línea de hoy dibujadas bajo/sobre las filas de la página
    stroke(doc, LINE);
    doc.setLineWidth(0.15);
    months.forEach((m) => doc.line(m.x, top, m.x, bottom));
    if (today >= t0 && today <= t1) {
      stroke(doc, BAD);
      doc.setLineWidth(0.4);
      doc.setLineDashPattern([1.2, 1.2], 0);
      doc.line(xOf(today), top - 1, xOf(today), bottom);
      doc.setLineDashPattern([], 0);
      font(doc, "bold", 6.5);
      ink(doc, BAD);
      doc.text("HOY", xOf(today), bottom + 3, { align: "center" });
      ink(doc);
    }
  };

  tasks.forEach((t, i) => {
    if (ctx.y + rowH + 6 > BOTTOM) {
      closePage(ctx.y);
      newPage(ctx);
      header();
      top = rowsTop();
      rowsOnPage = 0;
    }
    if (rowsOnPage % 2 === 1) {
      fill(doc, ZEBRA);
      doc.rect(M, ctx.y, CW, rowH, "F");
    }
    rowsOnPage++;
    const progress = clamp(Number(t.progress ?? 0));
    const s = dayMs(t.startDate);
    const e = dayMs(t.endDate);
    const overdue = progress < 100 && e < today;
    font(doc, t.isPhase ? "bold" : "normal", 8);
    ink(doc, INK);
    const rawName = `${i + 1}. ${String(t.name ?? "")}`;
    let name = rawName;
    if (doc.getTextWidth(name) > nameW - 3) {
      while (name.length > 1 && doc.getTextWidth(`${name}...`) > nameW - 3) name = name.slice(0, -1);
      name = `${name.trimEnd()}...`;
    }
    doc.text(name, M + 2, ctx.y + 4.9);
    if (Number.isFinite(s) && Number.isFinite(e)) {
      const x0 = xOf(s);
      const w = Math.max(2.2, xOf(e + DAY) - x0);
      const by = ctx.y + 1.9;
      const bh = 3.4;
      const color = progress >= 100 ? GOOD : overdue ? BAD : BRAND;
      fill(doc, t.isPhase ? BRAND_SOFT : TINT);
      doc.roundedRect(x0, by, w, bh, 1.7, 1.7, "F");
      if (progress > 0) {
        fill(doc, color);
        doc.roundedRect(x0, by, Math.max(bh, (w * progress) / 100), bh, 1.7, 1.7, "F");
      }
    }
    ctx.y += rowH;
  });

  // hitos como rombos al final del cronograma
  const milestones = (project.milestones ?? []).map((m) => ({ ms: dayMs(m.date), text: m.description })).filter((m) => Number.isFinite(m.ms));
  if (milestones.length) {
    if (ctx.y + rowH + 6 > BOTTOM) {
      closePage(ctx.y);
      newPage(ctx);
      header();
      top = rowsTop();
    }
    font(doc, "bold", 8);
    ink(doc, WARN);
    doc.text("Hitos", M + 2, ctx.y + 4.9);
    milestones.forEach((m) => {
      const x = Math.min(cx + cw - 2.4, Math.max(cx + 2.4, xOf(m.ms)));
      const y = ctx.y + 3.6;
      fill(doc, WARN);
      doc.triangle(x, y - 2.2, x + 2.2, y, x - 2.2, y, "F");
      doc.triangle(x, y + 2.2, x + 2.2, y, x - 2.2, y, "F");
    });
    ctx.y += rowH;
  }
  closePage(ctx.y);
  ink(doc);
  ctx.y += 9;

}

/* ── Tablas ──────────────────────────────────────────────────────────────── */

type Col = { header: string; w: number; align?: "left" | "center" | "right" };
type Cell = string | { bar: number; late?: boolean } | { pill: string; tone: Tone };
type Row = Cell[] | { group: string };

function tableHeader(ctx: Ctx, cols: Col[]) {
  const { doc } = ctx;
  fill(doc, TINT);
  doc.rect(M, ctx.y, CW, 7.6, "F");
  font(doc, "bold", 7);
  ink(doc, BRAND);
  let x = M;
  for (const col of cols) {
    const tx = col.align === "right" ? x + col.w - 2.5 : col.align === "center" ? x + col.w / 2 : x + 2.5;
    doc.text(col.header.toUpperCase(), tx, ctx.y + 5.1, { align: col.align ?? "left", charSpace: 0.4 });
    x += col.w;
  }
  ink(doc);
  ctx.y += 7.6;
}

function table(ctx: Ctx, cols: Col[], rows: Row[], empty: string) {
  const { doc } = ctx;
  if (rows.length === 0) {
    font(doc, "italic", 9);
    ink(doc, MUTED);
    doc.text(empty, M + 2, ctx.y + 4);
    ink(doc);
    ctx.y += 10;
    return;
  }
  ensure(ctx, 26);
  tableHeader(ctx, cols);
  let shade = 0;

  rows.forEach((row) => {
    if ("group" in row) {
      ensure(ctx, 18);
      font(doc, "bold", 8);
      fill(doc, [238, 236, 252]);
      doc.rect(M, ctx.y, CW, 6.4, "F");
      ink(doc, BRAND);
      doc.text(row.group, M + 2.5, ctx.y + 4.4);
      ink(doc);
      ctx.y += 6.4;
      shade = 0;
      return;
    }
    font(doc, "normal", 8.5);
    const wrapped = row.map((cell, c) => (typeof cell === "string" ? (doc.splitTextToSize(cell || "-", cols[c].w - 5) as string[]) : [""]));
    const lines = Math.max(1, ...wrapped.map((w) => w.length));
    const h = lines * 3.9 + 4;
    if (ctx.y + h > BOTTOM) {
      newPage(ctx);
      tableHeader(ctx, cols);
    }
    if (shade % 2 === 1) {
      fill(doc, ZEBRA);
      doc.rect(M, ctx.y, CW, h, "F");
    }
    shade++;
    let x = M;
    row.forEach((cell, c) => {
      const col = cols[c];
      if (typeof cell === "string") {
        font(doc, "normal", 8.5);
        ink(doc, INK);
        const tx = col.align === "right" ? x + col.w - 2.5 : col.align === "center" ? x + col.w / 2 : x + 2.5;
        doc.text(wrapped[c], tx, ctx.y + 5.2, { align: col.align ?? "left" });
      } else if ("bar" in cell) {
        const value = clamp(cell.bar);
        const color = value >= 100 ? GOOD : cell.late ? BAD : BRAND;
        bar(doc, x + 2.5, ctx.y + 3.4, col.w - 16, value, color, 2.6);
        font(doc, "bold", 8);
        ink(doc, color);
        doc.text(`${Math.round(value)}%`, x + col.w - 2.5, ctx.y + 5.4, { align: "right" });
      } else {
        pill(doc, x + 2.5, ctx.y + 2.4, cell.pill, cell.tone);
      }
      x += col.w;
    });
    stroke(doc, LINE);
    doc.setLineWidth(0.15);
    doc.line(M, ctx.y + h, M + CW, ctx.y + h);
    ctx.y += h;
  });
  ink(doc);
  ctx.y += 4;
}

/* ── Equipo e hitos ──────────────────────────────────────────────────────── */

const AVATARS: RGB[] = [BRAND, [37, 99, 235], [8, 145, 178], GOOD, WARN, [219, 39, 119]];

function team(ctx: Ctx, project: Project) {
  const { doc } = ctx;
  const members = project.teamMembers ?? [];
  section(ctx, "Equipo", members.length, 40);
  if (members.length === 0) {
    font(doc, "italic", 9);
    ink(doc, MUTED);
    doc.text("Sin participantes.", M + 2, ctx.y + 4);
    ink(doc);
    ctx.y += 10;
    return;
  }
  const cols = 2;
  const gap = 4;
  const w = (CW - gap) / cols;
  const h = 14;
  members.forEach((p, i) => {
    const col = i % cols;
    if (col === 0) ensure(ctx, h + 3);
    const x = M + col * (w + gap);
    fill(doc, [255, 255, 255]);
    stroke(doc, LINE);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, ctx.y, w, h, 2.5, 2.5, "FD");
    fill(doc, AVATARS[i % AVATARS.length]);
    doc.circle(x + 7.5, ctx.y + h / 2, 4.2, "F");
    font(doc, "bold", 9);
    ink(doc, [255, 255, 255]);
    doc.text((p.name.trim().charAt(0) || "?").toUpperCase(), x + 7.5, ctx.y + h / 2 + 1.3, { align: "center" });
    font(doc, "bold", 9);
    ink(doc, INK);
    doc.text((doc.splitTextToSize(p.name, w - 36) as string[])[0], x + 14.5, ctx.y + 6);
    font(doc, "normal", 7.5);
    ink(doc, MUTED);
    doc.text(p.teamStatus?.type ?? "", x + 14.5, ctx.y + 10.4);
    if (col === cols - 1 || i === members.length - 1) ctx.y += h + 3;
  });
  ink(doc);
  ctx.y += 2;
}

function milestonesBlock(ctx: Ctx, project: Project) {
  const { doc } = ctx;
  const list = [...(project.milestones ?? [])].sort((a, b) => dayMs(a.date) - dayMs(b.date));
  section(ctx, "Hitos", list.length, 36);
  if (list.length === 0) {
    font(doc, "italic", 9);
    ink(doc, MUTED);
    doc.text("Sin hitos.", M + 2, ctx.y + 4);
    ink(doc);
    ctx.y += 10;
    return;
  }
  const today = todayMs();
  list.forEach((m, i) => {
    const lines = doc.splitTextToSize(m.description, CW - 40) as string[];
    const h = Math.max(9, lines.length * 4 + 5);
    ensure(ctx, h);
    const passed = dayMs(m.date) < today;
    const x = M + 3;
    if (i < list.length - 1) {
      stroke(doc, LINE);
      doc.setLineWidth(0.5);
      doc.line(x, ctx.y + 4, x, ctx.y + h + 4);
    }
    fill(doc, passed ? GOOD : [255, 255, 255]);
    stroke(doc, passed ? GOOD : BRAND);
    doc.setLineWidth(0.6);
    doc.circle(x, ctx.y + 2.2, 2, "FD");
    font(doc, "bold", 8.5);
    ink(doc, passed ? GOOD : BRAND);
    doc.text(isoDay(m.date), M + 9, ctx.y + 3);
    font(doc, "normal", 9);
    ink(doc, INK);
    doc.text(lines, M + 34, ctx.y + 3);
    ctx.y += h;
  });
  ink(doc);
  ctx.y += 3;
}

/* ── Informe del expediente ──────────────────────────────────────────────── */

export function exportProjectPdf(project: Project) {
  const tasks = taskRows(project);
  const today = todayMs();
  const ctx = cover(project, "Expediente", project.name, [
    `Responsable: ${project.ownerName}`,
    `${isoDay(project.startDate)} a ${isoDay(project.endDate)}`,
    `${project.durationMonths} ${project.durationMonths === 1 ? "mes" : "meses"}`,
  ]);
  const doneCount = tasks.filter((t) => Number(t.progress ?? 0) >= 100).length;
  statCards(ctx, [
    { label: "Avance general", value: `${project.progress}%`, hint: project.progress >= 100 ? "Completado" : "del expediente", tone: "brand" },
    { label: "Presupuesto", value: formatMoney(project.budget), hint: "presupuesto oficial", tone: "good" },
    { label: "Tareas", value: `${doneCount} / ${tasks.length}`, hint: "completadas", tone: "warn" },
    { label: "Equipo", value: String((project.teamMembers ?? []).length), hint: "participantes", tone: "muted" },
  ]);
  overview(ctx, project);

  gantt(ctx, project);

  section(ctx, "Detalle de tareas", tasks.length, 40);
  table(
    ctx,
    [
      { header: "Tarea", w: 52 },
      { header: "Área", w: 28 },
      { header: "Responsable", w: 28 },
      { header: "Plazo", w: 28 },
      { header: "Avance", w: 46 },
    ],
    tasks.map((t) => {
      const s = dayMs(t.startDate);
      const e = dayMs(t.endDate);
      const progress = Number(t.progress ?? 0);
      return [
        `${t.isPhase ? "[Fase] " : ""}${String(t.name ?? "")}`,
        String((t.technicalArea as { name?: string } | undefined)?.name ?? ""),
        String(t.ownerName ?? ""),
        Number.isFinite(s) && Number.isFinite(e) ? `${shortDay(s)} - ${shortDay(e)}` : "",
        { bar: progress, late: progress < 100 && e < today },
      ] as Cell[];
    }),
    "Este expediente todavía no tiene tareas.",
  );

  const materials = materialRows(project);
  section(ctx, "Materiales", materials.length, 40);
  const byCategory = new Map<string, (string | number)[][]>();
  for (const m of materials) byCategory.set(String(m[1]), [...(byCategory.get(String(m[1])) ?? []), m]);
  const materialTableRows: Row[] = [];
  for (const [category, items] of [...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"))) {
    materialTableRows.push({ group: `${category}  ·  ${items.length}` });
    for (const m of items) materialTableRows.push([String(m[2]), String(m[0]), String(m[3]), String(m[4])]);
  }
  table(
    ctx,
    [
      { header: "Material", w: 56 },
      { header: "Tarea", w: 50 },
      { header: "Cant.", w: 16, align: "right" },
      { header: "Valores de la métrica", w: 60 },
    ],
    materialTableRows,
    "Ninguna tarea tiene materiales.",
  );

  team(ctx, project);
  milestonesBlock(ctx, project);

  footers(ctx);
  ctx.doc.save(`Expediente_${slug(project.name)}.pdf`);
}

/* ── Informe del historial ───────────────────────────────────────────────── */

const toneOf = (tone: ActivityEvent["tone"]): Tone =>
  tone === "positive" ? "good" : tone === "negative" ? "bad" : tone === "warning" ? "warn" : "brand";

export function exportActivityPdf(project: Project, events: ActivityEvent[]) {
  const ctx = cover(project, "Historial", project.name, [
    `${events.length} ${events.length === 1 ? "suceso" : "sucesos"}`,
    `Responsable: ${project.ownerName}`,
  ]);
  const { doc } = ctx;

  const actors = new Set(events.map((e) => e.actor)).size;
  const positive = events.filter((e) => e.tone === "positive").length;
  const negative = events.filter((e) => e.tone === "negative").length;
  statCards(ctx, [
    { label: "Sucesos", value: String(events.length), hint: "registrados", tone: "brand" },
    { label: "Altas y avances", value: String(positive), hint: "positivos", tone: "good" },
    { label: "Bajas y retrocesos", value: String(negative), hint: "negativos", tone: "bad" },
    { label: "Personas", value: String(actors), hint: "participaron", tone: "muted" },
  ]);

  if (events.length === 0) {
    font(doc, "italic", 9.5);
    ink(doc, MUTED);
    doc.text("Sin sucesos registrados.", M + 2, ctx.y + 4);
  }

  let lastDay = "";
  events.forEach((e, i) => {
    const date = new Date(e.createdAt);
    const dayKey = isoDay(e.createdAt);
    const summary = doc.splitTextToSize(e.summary, CW - 40) as string[];
    const changes = e.changes ?? [];
    const h = summary.length * 4.2 + changes.length * 4.6 + 8;
    const headerH = dayKey !== lastDay ? 12 : 0;
    ensure(ctx, h + headerH);

    if (dayKey !== lastDay) {
      lastDay = dayKey;
      font(doc, "bold", 9);
      ink(doc, INK);
      doc.text(
        date.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).replace(/^./, (c) => c.toUpperCase()),
        M,
        ctx.y + 6,
      );
      stroke(doc, LINE);
      doc.setLineWidth(0.2);
      doc.line(M, ctx.y + 8, M + CW, ctx.y + 8);
      ctx.y += 12;
    }

    const color = toneColor(toneOf(e.tone));
    const x = M + 22;
    if (i < events.length - 1) {
      stroke(doc, LINE);
      doc.setLineWidth(0.5);
      doc.line(x, ctx.y + 4, x, ctx.y + h);
    }
    font(doc, "normal", 8);
    ink(doc, MUTED);
    doc.text(date.toLocaleTimeString("es-MX", { hour12: false, hour: "2-digit", minute: "2-digit" }), M, ctx.y + 3.6);
    fill(doc, color);
    doc.circle(x, ctx.y + 2.6, 1.7, "F");
    font(doc, "bold", 8.5);
    ink(doc, INK);
    doc.text(e.actor, x + 6, ctx.y + 3.6);
    font(doc, "normal", 8.5);
    ink(doc, INK);
    doc.text(summary, x + 6, ctx.y + 8, { lineHeightFactor: 1.2 });
    let cy = ctx.y + 8 + (summary.length - 1) * 4.2;
    for (const c of changes) {
      cy += 4.6;
      font(doc, "normal", 7.8);
      ink(doc, MUTED);
      doc.text(`${c.label}:`, x + 8, cy);
      const lw = doc.getTextWidth(`${c.label}: `);
      ink(doc, BAD);
      doc.text(String(c.from), x + 8 + lw, cy);
      const fw = doc.getTextWidth(`${c.from}  `);
      ink(doc, MUTED);
      doc.text(">", x + 8 + lw + fw, cy);
      ink(doc, GOOD);
      doc.text(String(c.to), x + 8 + lw + fw + 4, cy);
    }
    ink(doc);
    ctx.y += h;
  });

  footers(ctx);
  doc.save(`Historial_${slug(project.name)}.pdf`);
}
