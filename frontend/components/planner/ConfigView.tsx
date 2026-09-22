"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/lib/api";
import { friendlyError } from "@/lib/errors";
import type { Theme } from "@/hooks/useTheme";

const THEME_OPTIONS: { value: Theme; label: string; description: string }[] = [
  { value: "light", label: "Claro", description: "Fondo blanco, para ambientes con buena luz." },
  { value: "dark", label: "Oscuro", description: "Fondo oscuro con acentos morados, para bajar el brillo." },
];

function ProfileSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setDone(false);
    if (!current || !next) {
      setError("Escribe tu contraseña actual y la nueva.");
      return;
    }
    if (next !== confirm) {
      setError("La confirmación no coincide con la nueva contraseña.");
      return;
    }
    setBusy(true);
    try {
      await api.changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch (submitError) {
      setError(friendlyError(submitError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Cuenta</p>
          <h2>Perfil</h2>
        </div>
        <span className="stat-icon">
          <Icon name="shield" size={16} />
        </span>
      </div>
      <p className="hero-lead" style={{ marginBottom: "var(--space-4)" }}>
        Cambia tu contraseña cuando quieras. No hace falta ningún paso extra por ahora.
      </p>

      <form className="form" onSubmit={submit}>
        <div className="form-row">
          <span>Contraseña actual</span>
          <input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            disabled={busy}
          />
        </div>
        <div className="form-row">
          <span>Contraseña nueva</span>
          <input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            disabled={busy}
          />
        </div>
        <div className="form-row">
          <span>Confirmar contraseña nueva</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            disabled={busy}
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        {done && !error && <p className="hero-lead">Contraseña actualizada.</p>}
        <button type="submit" className="btn btn-primary" disabled={busy || !current || !next}>
          {busy ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </form>
    </section>
  );
}

/** La verificación en dos pasos ya está construida (backend + pantallas),
 * pero congelada: Resend, en el plan gratuito, solo deja enviar correos a la
 * cuenta con la que se creó. Se retoma cuando se verifique un dominio propio
 * (ver patches/016-*.md). */
function SecuritySection() {
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Acceso</p>
          <h2>Verificación en dos pasos</h2>
        </div>
        <span className="stat-icon">
          <Icon name="shield" size={16} />
        </span>
      </div>
      <p className="hero-lead">
        Todavía no está disponible. Por ahora, entra al sistema normalmente con tu usuario y
        contraseña.
      </p>
    </section>
  );
}

export function ConfigView({ theme, onSetTheme }: { theme: Theme; onSetTheme: (theme: Theme) => void }) {
  return (
    <div className="view settings">
      <header className="hero">
        <div>
          <p className="eyebrow">Configuración</p>
          <h1>Configuración del sistema</h1>
          <p className="hero-lead">Personaliza cómo se ve Project Planner y protege tu cuenta.</p>
        </div>
      </header>

      <div style={{ display: "grid", gap: "var(--space-6)" }}>
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Apariencia</p>
              <h2>Tema</h2>
            </div>
            <span className="stat-icon">
              <Icon name="sun" size={16} />
            </span>
          </div>
          <p className="hero-lead" style={{ marginBottom: "var(--space-4)" }}>
            Elige cómo se ve la interfaz. El cambio se aplica al instante y se recuerda en este
            navegador.
          </p>

          <div className="theme-options">
            {THEME_OPTIONS.map((option) => {
              const active = theme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={active ? "theme-option is-active" : "theme-option"}
                  onClick={() => onSetTheme(option.value)}
                  aria-pressed={active}
                >
                  <span className={`theme-swatch theme-swatch-${option.value}`} aria-hidden="true">
                    <Icon name={option.value === "light" ? "sun" : "moon"} size={18} />
                  </span>
                  <span className="theme-option-body">
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </span>
                  {active && (
                    <span className="theme-option-check" aria-hidden="true">
                      <Icon name="check" size={14} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <ProfileSection />
        <SecuritySection />
      </div>
    </div>
  );
}
