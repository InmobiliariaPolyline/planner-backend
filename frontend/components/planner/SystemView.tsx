"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Primitives";
import { API_URL, api, type SessionUser } from "@/lib/api";
import { friendlyError } from "@/lib/errors";
import type { Theme } from "@/hooks/useTheme";
import { playChime } from "@/lib/sound";
import { SYSTEM_PATCH, SYSTEM_RELEASE, SYSTEM_VERSION } from "@/lib/version";
import {
  ACCENT_PRESETS,
  DEFAULT_PREFERENCES,
  resetPreferences,
  setPreferences,
  usePreferences,
  type Preferences,
} from "@/lib/preferences";

type SectionId = "perfil" | "apariencia" | "accesibilidad" | "seguridad" | "estado";

const SECTIONS: { id: SectionId; label: string; description: string; icon: IconName }[] = [
  { id: "perfil", label: "Perfil", description: "Tu cuenta y tu rol.", icon: "user" },
  { id: "apariencia", label: "Apariencia", description: "Tema, color y estilo.", icon: "sun" },
  { id: "accesibilidad", label: "Accesibilidad", description: "Texto, movimiento y contraste.", icon: "eye" },
  { id: "seguridad", label: "Seguridad", description: "Contraseña y sesión.", icon: "shield" },
  { id: "estado", label: "Estado del sistema", description: "Conexión y datos locales.", icon: "activity" },
];

function SectionHead({ title, lead }: { title: string; lead: string }) {
  return (
    <header className="system-head">
      <h2>{title}</h2>
      <p>{lead}</p>
    </header>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          className={value === option.value ? "segmented-item is-active" : "segmented-item"}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <div className="pref-row">
      <span className="pref-row-text">
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={checked ? "switch is-on" : "switch"}
        onClick={() => onChange(!checked)}
      >
        <span className="switch-knob" />
      </button>
    </div>
  );
}

function PrefRow({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="pref-row pref-row-stack">
      <span className="pref-row-text">
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      {children}
    </div>
  );
}

/* --- Perfil ---------------------------------------------------------------- */

/** Reduce la imagen elegida a un cuadrado de 128 px (recorte centrado) y la
 * devuelve como data URL JPEG: pesa pocos KB y cabe en el perfil. */
async function resizeAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Elige un archivo de imagen (PNG, JPG o WebP).");
  if (file.size > 8 * 1024 * 1024) throw new Error("La imagen pesa demasiado (máximo 8 MB).");
  const bitmap = await createImageBitmap(file);
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no pudo procesar la imagen.");
  const side = Math.min(bitmap.width, bitmap.height);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

function ProfileSection({
  user,
  onSessionUpdated,
}: {
  user: SessionUser;
  onSessionUpdated: (token: string, user: SessionUser) => void;
}) {
  const [name, setName] = useState(user.name);
  const [jobTitle, setJobTitle] = useState(user.jobTitle ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [avatarColor, setAvatarColor] = useState<string | null>(user.avatarColor ?? null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty =
    name.trim() !== user.name ||
    jobTitle.trim() !== (user.jobTitle ?? "") ||
    phone.trim() !== (user.phone ?? "") ||
    avatarColor !== (user.avatarColor ?? null) ||
    avatarUrl !== (user.avatarUrl ?? null);

  async function pickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setSaved(false);
    try {
      setAvatarUrl(await resizeAvatar(file));
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : "No fue posible leer la imagen.");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    if (name.trim().length < 2) {
      setError("Escribe tu nombre (al menos 2 caracteres).");
      return;
    }
    setBusy(true);
    try {
      const result = await api.updateProfile({
        name: name.trim(),
        jobTitle: jobTitle.trim() || null,
        phone: phone.trim() || null,
        avatarColor,
        avatarUrl,
      });
      onSessionUpdated(result.token, result.user);
      setSaved(true);
    } catch (saveError) {
      setError(friendlyError(saveError));
    } finally {
      setBusy(false);
    }
  }

  // Cualquier cambio en el formulario oculta el aviso de «Perfil actualizado».
  const changed = () => setSaved(false);

  return (
    <>
      <SectionHead title="Perfil" lead="Personaliza cómo apareces en el sistema: nombre, foto, color, cargo y teléfono." />
      <form className="panel profile-editor" onSubmit={submit}>
        <div className="profile-photo">
          <Avatar name={name || user.name} size="xl" src={avatarUrl} color={avatarColor} />
          <div className="profile-photo-actions">
            <div>
              <strong>Foto de perfil</strong>
              <p className="form-hint">Se recorta en cuadrado y se reduce sola. PNG, JPG o WebP.</p>
            </div>
            <div className="profile-photo-buttons">
              <label className="btn btn-secondary btn-sm">
                <input type="file" accept="image/png,image/jpeg,image/webp" className="visually-hidden-input" onChange={pickPhoto} />
                <Icon name="plus" size={14} />
                {avatarUrl ? "Cambiar foto" : "Subir foto"}
              </label>
              {avatarUrl && (
                <button
                  type="button"
                  className="btn btn-ghost-danger btn-sm"
                  onClick={() => {
                    setAvatarUrl(null);
                    changed();
                  }}
                >
                  <Icon name="trash" size={14} />
                  Quitar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="form-row">
          <span>Color del avatar</span>
          <div className="swatches" role="radiogroup" aria-label="Color del avatar">
            {ACCENT_PRESETS.map((preset) => {
              const active = avatarColor === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={preset.name}
                  title={preset.name}
                  className={active ? "swatch is-active" : "swatch"}
                  style={{ background: preset.value }}
                  onClick={() => {
                    setAvatarColor(preset.value);
                    changed();
                  }}
                >
                  {active && <Icon name="check" size={14} />}
                </button>
              );
            })}
            {avatarColor && (
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setAvatarColor(null);
                  changed();
                }}
              >
                Predeterminado
              </button>
            )}
          </div>
          <small className="form-hint">Se usa cuando no tienes foto.</small>
        </div>

        <div className="form-grid">
          <div className="form-row">
            <span>Nombre para mostrar</span>
            <input
              value={name}
              maxLength={80}
              onChange={(e) => {
                setName(e.target.value);
                changed();
              }}
              disabled={busy}
            />
          </div>
          <div className="form-row">
            <span>Cargo</span>
            <input
              value={jobTitle}
              maxLength={80}
              placeholder="Ej. Arquitecta residente"
              onChange={(e) => {
                setJobTitle(e.target.value);
                changed();
              }}
              disabled={busy}
            />
          </div>
        </div>
        <div className="form-grid">
          <div className="form-row">
            <span>Teléfono</span>
            <input
              value={phone}
              maxLength={30}
              inputMode="tel"
              placeholder="Ej. +51 987 654 321"
              onChange={(e) => {
                setPhone(e.target.value);
                changed();
              }}
              disabled={busy}
            />
          </div>
          <div className="form-row">
            <span>Usuario de acceso</span>
            <input value={user.username} disabled readOnly />
            <small className="form-hint">No se puede cambiar. Rol: {user.roleLabel}.</small>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}
        {saved && !error && (
          <p className="form-success">
            <Icon name="check-circle" size={15} />
            Perfil actualizado.
          </p>
        )}
        <div>
          <button type="submit" className="btn btn-primary" disabled={busy || !dirty}>
            {busy ? "Guardando…" : "Guardar perfil"}
          </button>
        </div>
      </form>
    </>
  );
}

/* --- Apariencia ------------------------------------------------------------ */

function AppearanceSection({ theme, onSetTheme }: { theme: Theme; onSetTheme: (theme: Theme) => void }) {
  const prefs = usePreferences();
  const customValue = prefs.accent ?? "#5b3df5";
  const isPreset = prefs.accent !== null && ACCENT_PRESETS.some((p) => p.value === prefs.accent);

  return (
    <>
      <SectionHead
        title="Apariencia"
        lead="Personaliza cómo se ve el sistema. Los cambios se aplican al instante y se guardan en este navegador."
      />

      <section className="panel pref-group">
        <PrefRow label="Tema" hint="Claro para ambientes con luz; oscuro para bajar el brillo.">
          <Segmented<Theme>
            label="Tema"
            value={theme}
            onChange={onSetTheme}
            options={[
              { value: "light", label: "Claro" },
              { value: "dark", label: "Oscuro" },
            ]}
          />
        </PrefRow>

        <PrefRow label="Color de acento" hint="Botones, selección y barras de progreso.">
          <div className="swatches" role="radiogroup" aria-label="Color de acento">
            {ACCENT_PRESETS.map((preset) => {
              const active = prefs.accent === preset.value;
              return (
                <button
                  key={preset.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={preset.name}
                  title={preset.name}
                  className={active ? "swatch is-active" : "swatch"}
                  style={{ background: preset.value }}
                  onClick={() => setPreferences({ accent: preset.value })}
                >
                  {active && <Icon name="check" size={14} />}
                </button>
              );
            })}
            <label className={!isPreset && prefs.accent ? "swatch swatch-custom is-active" : "swatch swatch-custom"} title="Color personalizado">
              <input
                type="color"
                value={customValue}
                onChange={(event) => setPreferences({ accent: event.target.value })}
                aria-label="Color personalizado"
              />
              <Icon name="sparkles" size={14} />
            </label>
            {prefs.accent && (
              <button type="button" className="link-btn" onClick={() => setPreferences({ accent: null })}>
                Predeterminado
              </button>
            )}
          </div>
        </PrefRow>

        <PrefRow label="Esquinas" hint="Qué tan redondeados se ven botones, tarjetas y campos.">
          <Segmented
            label="Esquinas"
            value={prefs.radius}
            onChange={(radius) => setPreferences({ radius })}
            options={[
              { value: "sharp", label: "Rectas" },
              { value: "normal", label: "Suaves" },
              { value: "round", label: "Redondas" },
            ]}
          />
        </PrefRow>

        <PrefRow label="Densidad" hint="Cuánto espacio hay entre los elementos.">
          <Segmented
            label="Densidad"
            value={prefs.density}
            onChange={(density) => setPreferences({ density })}
            options={[
              { value: "comfortable", label: "Cómoda" },
              { value: "compact", label: "Compacta" },
            ]}
          />
        </PrefRow>

        <PrefRow label="Efectos" hint="Con profundidad (sombras, inclinación 3D) o plano y minimalista.">
          <Segmented
            label="Efectos"
            value={prefs.depth}
            onChange={(depth) => setPreferences({ depth })}
            options={[
              { value: "3d", label: "Con profundidad" },
              { value: "flat", label: "Plano" },
            ]}
          />
        </PrefRow>
      </section>

      <section className="panel preview">
        <p className="eyebrow">Vista previa</p>
        <div className="preview-row">
          <button type="button" className="btn btn-primary">
            Botón principal
          </button>
          <button type="button" className="btn btn-secondary">
            Secundario
          </button>
          <span className="badge tone-accent">Insignia</span>
          <div className="progress preview-progress" aria-hidden="true">
            <span className="progress-fill" style={{ width: "64%" }} />
          </div>
        </div>
      </section>

      <button type="button" className="btn btn-secondary" onClick={() => resetPreferences()}>
        Restablecer apariencia
      </button>
    </>
  );
}

/* --- Accesibilidad --------------------------------------------------------- */

function AccessibilitySection() {
  const prefs = usePreferences();
  return (
    <>
      <SectionHead title="Accesibilidad" lead="Ajusta el sistema para leerlo y usarlo con más comodidad." />
      <section className="panel pref-group">
        <PrefRow label="Tamaño del texto" hint="Escala todo el texto de la interfaz.">
          <Segmented
            label="Tamaño del texto"
            value={prefs.fontScale}
            onChange={(fontScale) => setPreferences({ fontScale })}
            options={[
              { value: "sm", label: "Pequeño" },
              { value: "md", label: "Normal" },
              { value: "lg", label: "Grande" },
              { value: "xl", label: "Muy grande" },
            ]}
          />
        </PrefRow>
        <Switch
          label="Reducir movimiento"
          hint="Quita animaciones y transiciones."
          checked={prefs.reduceMotion}
          onChange={(reduceMotion) => setPreferences({ reduceMotion })}
        />
        <Switch
          label="Alto contraste"
          hint="Bordes y textos más marcados."
          checked={prefs.highContrast}
          onChange={(highContrast) => setPreferences({ highContrast })}
        />
        <div className="pref-row">
          <span className="pref-row-text">
            <strong>Sonido de notificaciones</strong>
            <small>Un tono suave cuando llega un aviso nuevo.</small>
          </span>
          <span className="system-status">
            <button type="button" className="btn btn-secondary btn-sm" onClick={playChime}>
              Probar
            </button>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.notifySound}
              aria-label="Sonido de notificaciones"
              className={prefs.notifySound ? "switch is-on" : "switch"}
              onClick={() => setPreferences({ notifySound: !prefs.notifySound })}
            >
              <span className="switch-knob" />
            </button>
          </span>
        </div>
      </section>
      <p className="form-hint">
        Si tu sistema operativo ya pide reducir el movimiento, el sistema lo respeta aunque
        este interruptor esté apagado.
      </p>
    </>
  );
}

/* --- Seguridad ------------------------------------------------------------- */

function SecuritySection({ onSignOut }: { onSignOut: () => void }) {
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
    <>
      <SectionHead title="Seguridad" lead="Protege tu cuenta: contraseña, verificación y sesión." />

      <section className="panel">
        <h3 className="system-subtitle">Cambiar contraseña</h3>
        <form className="form" onSubmit={submit}>
          <div className="form-row">
            <span>Contraseña actual</span>
            <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} disabled={busy} />
          </div>
          <div className="form-grid">
            <div className="form-row">
              <span>Contraseña nueva</span>
              <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} disabled={busy} />
            </div>
            <div className="form-row">
              <span>Confirmar contraseña nueva</span>
              <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={busy} />
            </div>
          </div>
          {error && <p className="form-error">{error}</p>}
          {done && !error && (
            <p className="form-success">
              <Icon name="check-circle" size={15} />
              Contraseña actualizada.
            </p>
          )}
          <div>
            <button type="submit" className="btn btn-primary" disabled={busy || !current || !next}>
              {busy ? "Guardando…" : "Cambiar contraseña"}
            </button>
          </div>
        </form>
      </section>

      {/* La verificación en dos pasos está construida pero en pausa: Resend, en el
          plan gratuito, solo envía a la cuenta titular (ver patches/016-*.md). */}
      <section className="panel pref-row">
        <span className="pref-row-text">
          <strong>Verificación en dos pasos</strong>
          <small>Todavía no está disponible. Por ahora entras con usuario y contraseña.</small>
        </span>
        <span className="badge tone-warning">En pausa</span>
      </section>

      <section className="panel pref-row">
        <span className="pref-row-text">
          <strong>Sesión</strong>
          <small>Cierra la sesión en este navegador.</small>
        </span>
        <button type="button" className="btn btn-ghost-danger" onClick={onSignOut}>
          <Icon name="logout" size={16} />
          Cerrar sesión
        </button>
      </section>
    </>
  );
}

/* --- Estado del sistema ---------------------------------------------------- */

type Health = { state: "checking" } | { state: "ok"; ms: number } | { state: "down" };

async function pingApi(): Promise<Health> {
  const started = performance.now();
  try {
    const response = await fetch(`${API_URL}/health`, { cache: "no-store" });
    return response.ok ? { state: "ok", ms: Math.round(performance.now() - started) } : { state: "down" };
  } catch {
    return { state: "down" };
  }
}

function StatusSection() {
  const [health, setHealth] = useState<Health>({ state: "checking" });
  const prefs = usePreferences();

  const recheck = () => {
    setHealth({ state: "checking" });
    void pingApi().then(setHealth);
  };

  // El estado inicial ya es «comprobando»: la primera consulta no necesita setState previo.
  useEffect(() => {
    let cancelled = false;
    void pingApi().then((result) => {
      if (!cancelled) setHealth(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const customized = (Object.keys(DEFAULT_PREFERENCES) as (keyof Preferences)[]).filter(
    (key) => prefs[key] !== DEFAULT_PREFERENCES[key],
  ).length;

  let host = API_URL;
  try {
    host = new URL(API_URL).host;
  } catch {
    /* se muestra tal cual */
  }

  return (
    <>
      <SectionHead title="Estado del sistema" lead="Versión, conexión con el servidor y datos guardados en este navegador." />
      <section className="panel version-card">
        <span className="version-badge">{SYSTEM_VERSION}</span>
        <div>
          <h3>Project Planner</h3>
          <p className="form-hint">
            Versión {SYSTEM_VERSION} · Parche {SYSTEM_PATCH} · {SYSTEM_RELEASE}
          </p>
        </div>
      </section>
      <section className="panel pref-row">
        <span className="pref-row-text">
          <strong>Servidor (API)</strong>
          <small>{host}</small>
        </span>
        <span className="system-status">
          {health.state === "checking" && <span className="badge">Comprobando…</span>}
          {health.state === "ok" && <span className="badge tone-success">En línea · {health.ms} ms</span>}
          {health.state === "down" && <span className="badge tone-danger">Sin conexión</span>}
          <button type="button" className="btn btn-secondary btn-sm" onClick={recheck}>
            Comprobar
          </button>
        </span>
      </section>
      <section className="panel pref-row">
        <span className="pref-row-text">
          <strong>Preferencias guardadas</strong>
          <small>
            {customized === 0
              ? "Usas los valores predeterminados."
              : `${customized} ajuste${customized === 1 ? "" : "s"} personalizado${customized === 1 ? "" : "s"} en este navegador.`}
          </small>
        </span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => resetPreferences()} disabled={customized === 0}>
          Restablecer todo
        </button>
      </section>
    </>
  );
}

/* --- Módulo ---------------------------------------------------------------- */

export function SystemView({
  theme,
  onSetTheme,
  user,
  onSignOut,
  onSessionUpdated,
}: {
  theme: Theme;
  onSetTheme: (theme: Theme) => void;
  user: SessionUser;
  onSignOut: () => void;
  onSessionUpdated: (token: string, user: SessionUser) => void;
}) {
  const [active, setActive] = useState<SectionId>("perfil");

  return (
    <div className="view system">
      <header className="hero">
        <div>
          <p className="eyebrow">Sistema</p>
          <h1>Sistema</h1>
          <p className="hero-lead">Tu cuenta, la apariencia y la seguridad en un solo lugar.</p>
        </div>
      </header>

      <div className="system-layout">
        <nav className="system-nav" aria-label="Secciones del sistema">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={active === section.id ? "system-nav-item is-active" : "system-nav-item"}
              onClick={() => setActive(section.id)}
              aria-current={active === section.id ? "page" : undefined}
            >
              <Icon name={section.icon} size={17} />
              <span className="system-nav-text">
                <strong>{section.label}</strong>
                <small>{section.description}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="system-body" key={active}>
          {active === "perfil" && <ProfileSection user={user} onSessionUpdated={onSessionUpdated} />}
          {active === "apariencia" && <AppearanceSection theme={theme} onSetTheme={onSetTheme} />}
          {active === "accesibilidad" && <AccessibilitySection />}
          {active === "seguridad" && <SecuritySection onSignOut={onSignOut} />}
          {active === "estado" && <StatusSection />}
        </div>
      </div>
    </div>
  );
}
