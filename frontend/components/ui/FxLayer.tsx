"use client";

import { useEffect } from "react";

const TILT = ".project-card, .stat-card, .config-module-card, .theme-option, .task-details-card";
const MAGNET = ".btn-primary";

// Efectos que siguen al cursor, resueltos con delegación de eventos y variables
// CSS para no tocar los componentes: inclinación 3D de tarjetas (--rx, --ry),
// botones magnéticos (--bx, --by) y paralaje del fondo (--px, --py). Se desactivan con "reducir movimiento" y en pantallas táctiles.
export function FxLayer() {
  useEffect(() => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (calm.matches || !fine.matches) return;

    const root = document.documentElement;
    let raf = 0;
    let last: PointerEvent | null = null;
    let active: HTMLElement | null = null;
    let magnet: HTMLElement | null = null;

    const reset = (el: HTMLElement | null) => {
      if (!el) return;
      el.style.removeProperty("--rx");
      el.style.removeProperty("--ry");
      el.style.removeProperty("--bx");
      el.style.removeProperty("--by");
    };

    const frame = () => {
      raf = 0;
      const e = last;
      if (!e) return;
      root.style.setProperty("--px", ((e.clientX / window.innerWidth - 0.5) * 2).toFixed(3));
      root.style.setProperty("--py", ((e.clientY / window.innerHeight - 0.5) * 2).toFixed(3));

      const target = e.target instanceof Element ? e.target : null;
      const card = target?.closest<HTMLElement>(TILT) ?? null;
      if (card !== active) {
        reset(active);
        active = card;
      }
      if (card) {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty("--ry", `${((x - 0.5) * 7).toFixed(2)}deg`);
        card.style.setProperty("--rx", `${((0.5 - y) * 7).toFixed(2)}deg`);
      }

      const btn = target?.closest<HTMLElement>(MAGNET) ?? null;
      if (btn !== magnet) {
        reset(magnet);
        magnet = btn;
      }
      if (btn) {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty("--bx", `${((e.clientX - (r.left + r.width / 2)) * 0.12).toFixed(1)}px`);
        btn.style.setProperty("--by", `${((e.clientY - (r.top + r.height / 2)) * 0.18).toFixed(1)}px`);
      }
    };

    const onMove = (e: PointerEvent) => {
      last = e;
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const onLeave = () => {
      reset(active);
      reset(magnet);
      active = null;
      magnet = null;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
      reset(active);
      reset(magnet);
    };
  }, []);

  return null;
}
