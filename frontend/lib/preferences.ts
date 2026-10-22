"use client";

import { useSyncExternalStore } from "react";

// Preferencias de interfaz del módulo «Sistema». Se guardan en este navegador
// (localStorage) y se aplican como atributos data-* y variables CSS sobre <html>.

export type Radius = "sharp" | "normal" | "round";
export type Density = "comfortable" | "compact";
export type FontScale = "sm" | "md" | "lg" | "xl";
export type Depth = "3d" | "flat";

export type Preferences = {
  /** Color de acento en hexadecimal; null = el predeterminado del tema. */
  accent: string | null;
  radius: Radius;
  density: Density;
  fontScale: FontScale;
  depth: Depth;
  reduceMotion: boolean;
  highContrast: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = {
  accent: null,
  radius: "normal",
  density: "comfortable",
  fontScale: "md",
  depth: "3d",
  reduceMotion: false,
  highContrast: false,
};

export const ACCENT_PRESETS: { name: string; value: string }[] = [
  { name: "Violeta", value: "#5b3df5" },
  { name: "Azul", value: "#2563eb" },
  { name: "Cian", value: "#0891b2" },
  { name: "Esmeralda", value: "#059669" },
  { name: "Ámbar", value: "#d97706" },
  { name: "Rosa", value: "#db2777" },
  { name: "Rojo", value: "#dc2626" },
  { name: "Grafito", value: "#475569" },
];

const KEY = "project-planner-prefs";
const EVENT = "project-planner-prefs-change";

const HEX = /^#[0-9a-fA-F]{6}$/;

function sanitize(raw: unknown): Preferences {
  const base = { ...DEFAULT_PREFERENCES };
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  if (typeof r.accent === "string" && HEX.test(r.accent)) base.accent = r.accent.toLowerCase();
  if (r.radius === "sharp" || r.radius === "round") base.radius = r.radius;
  if (r.density === "compact") base.density = "compact";
  if (r.fontScale === "sm" || r.fontScale === "lg" || r.fontScale === "xl") base.fontScale = r.fontScale;
  if (r.depth === "flat") base.depth = "flat";
  base.reduceMotion = r.reduceMotion === true;
  base.highContrast = r.highContrast === true;
  return base;
}

let cache: Preferences | null = null;

function read(): Preferences {
  if (cache) return cache;
  try {
    cache = sanitize(JSON.parse(window.localStorage.getItem(KEY) ?? "null"));
  } catch {
    cache = { ...DEFAULT_PREFERENCES };
  }
  return cache;
}

/** Aplica las preferencias a <html>: atributos data-* y variables de acento. */
export function applyPreferences(prefs: Preferences) {
  const root = document.documentElement;
  root.dataset.radius = prefs.radius;
  root.dataset.density = prefs.density;
  root.dataset.fontscale = prefs.fontScale;
  root.dataset.depth = prefs.depth;
  root.dataset.motion = prefs.reduceMotion ? "reduced" : "full";
  root.dataset.contrast = prefs.highContrast ? "high" : "normal";

  const vars = ["--accent", "--accent-2", "--accent-hover", "--accent-subtle", "--accent-on-subtle", "--grad"];
  if (!prefs.accent) {
    vars.forEach((v) => root.style.removeProperty(v));
    return;
  }
  const a = prefs.accent;
  root.style.setProperty("--accent", a);
  root.style.setProperty("--accent-2", `color-mix(in srgb, ${a} 78%, #ffffff)`);
  root.style.setProperty("--accent-hover", `color-mix(in srgb, ${a} 84%, #000000)`);
  root.style.setProperty("--accent-subtle", `color-mix(in srgb, ${a} 13%, var(--surface))`);
  root.style.setProperty("--accent-on-subtle", `color-mix(in srgb, ${a} 62%, var(--text))`);
  root.style.setProperty(
    "--grad",
    `linear-gradient(135deg, color-mix(in srgb, ${a} 78%, #ffffff), ${a} 55%, color-mix(in srgb, ${a} 70%, #3f6bff))`,
  );
}

export function setPreferences(patch: Partial<Preferences>) {
  cache = sanitize({ ...read(), ...patch });
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* sin almacenamiento: las preferencias solo duran la sesión */
  }
  applyPreferences(cache);
  window.dispatchEvent(new Event(EVENT));
}

export function resetPreferences() {
  setPreferences({ ...DEFAULT_PREFERENCES });
}

function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_PREFERENCES);
}

/** Atributos iniciales para evitar parpadeo (se inyecta como script en <head>). */
export const PREFS_BOOT_SCRIPT = `try{var p=JSON.parse(localStorage.getItem('${KEY}')||'null')||{};var d=document.documentElement.dataset;d.radius=p.radius==='sharp'||p.radius==='round'?p.radius:'normal';d.density=p.density==='compact'?'compact':'comfortable';d.fontscale=['sm','lg','xl'].indexOf(p.fontScale)>-1?p.fontScale:'md';d.depth=p.depth==='flat'?'flat':'3d';d.motion=p.reduceMotion===true?'reduced':'full';d.contrast=p.highContrast===true?'high':'normal';}catch(e){}`;
