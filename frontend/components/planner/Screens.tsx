"use client";

import { useEffect, useState, type FormEvent } from "react";
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
  onLogin,
  error,
  loading,
}: {
  projectCount: number;
  onLogin: (username: string, password: string) => void;
  error: string | null;
  loading: boolean;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password || loading) return;
    onLogin(username.trim(), password);
  };

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
          <span>Acceso al sistema</span>
          <span className="status-dot">Sistema operativo</span>
        </div>
        <form className="login-form form" onSubmit={submit}>
          <p className="eyebrow">Bienvenido</p>
          <h2>Inicia sesión para continuar.</h2>
          <p className="login-form-lead">
            Entra con tu usuario y contraseña para gestionar proyectos, equipo y fechas clave.
          </p>

          {error && <p className="form-error">{error}</p>}

          <div className="form-row">
            <span>Usuario</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
              disabled={loading}
              autoFocus
            />
          </div>
          <div className="form-row">
            <span>Contraseña</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading || !username.trim() || !password}
          >
            {loading ? "Entrando…" : "Entrar"}
            {!loading && <Icon name="arrow-right" size={16} />}
          </button>
        </form>
      </section>
    </main>
  );
}
