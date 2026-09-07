"use client";

import { Icon } from "@/components/ui/Icon";

function BrandMark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={`brand-mark brand-mark-${size}`} aria-hidden="true">
      <Icon name="target" size={size === "lg" ? 22 : 18} />
    </span>
  );
}

export function LoadingScreen() {
  return (
    <main className="boot-screen" aria-label="Cargando Project Planner">
      <div className="boot-brand">
        <BrandMark size="lg" />
        <div>
          <strong>Project Planner</strong>
          <span>Control de proyectos</span>
        </div>
      </div>
      <div className="boot-bar" role="progressbar" aria-label="Cargando aplicación">
        <span />
      </div>
      <p>Preparando tu espacio de trabajo…</p>
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
