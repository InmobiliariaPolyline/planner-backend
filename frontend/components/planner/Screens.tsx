"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

function BrandMark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={`brand-mark brand-mark-${size}`} aria-hidden="true">
      <Icon name="target" size={size === "lg" ? 24 : 18} />
    </span>
  );
}

const BOOT_MS = 1400;

export function LoadingScreen() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / BOOT_MS);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out
      setPct(Math.round(eased * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <main className="boot" aria-label="Iniciando Project Planner">
      <div className="boot-logo">
        <BrandMark size="lg" />
      </div>
      <div className="boot-meta">
        <strong>Project Planner</strong>
        <span>Iniciando sistema…</span>
      </div>
      <div
        className="boot-progress"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span className="boot-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="boot-pct">{pct}%</span>
    </main>
  );
}

export function LoginScreen({
  projectCount,
  onEnter,
}: {
  projectCount: number;
  onEnter: () => void;
}) {
  return (
    <main className="login">
      <section className="login-aside">
        <div className="login-aside-top">
          <BrandMark size="lg" />
          <span>PROJECT PLANNER</span>
        </div>
        <div className="login-aside-body">
          <p className="eyebrow">Control de proyectos</p>
          <h1>Cada expediente, con una ejecución clara.</h1>
          <p className="login-aside-lead">
            Consulta expedientes, revisa el cronograma y mantén cada entrega bajo control desde un
            único panel.
          </p>
        </div>
        <dl className="login-aside-stats">
          <div>
            <dt>{projectCount || "—"}</dt>
            <dd>expedientes bajo seguimiento</dd>
          </div>
        </dl>
      </section>

      <section className="login-panel">
        <div className="login-panel-head">
          <span>Acceso administrativo</span>
          <span className="status-dot">Sistema operativo</span>
        </div>
        <div className="login-form">
          <p className="eyebrow">Bienvenido</p>
          <h2>Tu espacio de trabajo está listo.</h2>
          <p className="login-form-lead">
            Entra para gestionar proyectos, equipo y fechas clave.
          </p>
          <div className="login-hint">
            <span className="login-hint-icon">
              <Icon name="arrow-right" size={16} />
            </span>
            <div>
              <strong>Panel de gestión de proyectos</strong>
              <span>Sesión de demostración</span>
            </div>
          </div>
          <button type="button" className="btn btn-primary btn-block" onClick={onEnter}>
            Acceder al sistema
            <Icon name="arrow-right" size={16} />
          </button>
          <p className="login-note">Esta es una sesión de demostración sin autenticación real.</p>
        </div>
      </section>
    </main>
  );
}
