"use client";

import { Icon } from "@/components/ui/Icon";
import type { Theme } from "@/hooks/useTheme";

const THEME_OPTIONS: { value: Theme; label: string; description: string }[] = [
  { value: "light", label: "Claro", description: "Fondo blanco, para ambientes con buena luz." },
  { value: "dark", label: "Oscuro", description: "Fondo oscuro con acentos morados, para bajar el brillo." },
];

export function ConfigView({ theme, onSetTheme }: { theme: Theme; onSetTheme: (theme: Theme) => void }) {
  return (
    <div className="view settings">
      <header className="hero">
        <div>
          <p className="eyebrow">Configuración</p>
          <h1>Configuración del sistema</h1>
          <p className="hero-lead">Personaliza cómo se ve Project Planner para ti.</p>
        </div>
      </header>

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
    </div>
  );
}
