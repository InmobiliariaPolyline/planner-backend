"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { SYSTEM_VERSION } from "@/lib/version";
import { TwoFactorCodeForm } from "@/components/ui/TwoFactorCodeForm";
import type { TwoFactorChallenge } from "@/hooks/useAuth";

function BrandMark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={`brand-mark brand-mark-${size}`} aria-hidden="true">
      <Icon name="target" size={size === "lg" ? 24 : 18} />
    </span>
  );
}

const BOOT_MS = 1600;

const BOOT_STEPS: { at: number; icon: IconName; label: string }[] = [
  { at: 0, icon: "sparkles", label: "Iniciando sistema" },
  { at: 35, icon: "layers", label: "Cargando módulos" },
  { at: 70, icon: "shield", label: "Verificando sesión" },
  { at: 95, icon: "check-circle", label: "Todo listo" },
];

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

  const step = BOOT_STEPS.findLast((s) => pct >= s.at) ?? BOOT_STEPS[0];

  return (
    <main className="boot" aria-label="Iniciando Project Planner">
      <div className="boot-aurora" aria-hidden="true" />
      <div className="boot-stage">
        <span className="boot-ring boot-ring-1" aria-hidden="true" />
        <span className="boot-ring boot-ring-2" aria-hidden="true" />
        <span className="boot-ring boot-ring-3" aria-hidden="true" />
        <div className="boot-logo">
          <BrandMark size="lg" />
        </div>
      </div>
      <div className="boot-meta">
        <strong>Project Planner</strong>
        <span key={step.label} className="boot-step">
          <Icon name={step.icon} size={13} />
          {step.label}
        </span>
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

const LOGIN_FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: "layers", title: "Expedientes ordenados", text: "Cronograma, tareas y materiales en un solo lugar." },
  { icon: "activity", title: "Historial en vivo", text: "Cada cambio queda registrado con su autor." },
  { icon: "shield", title: "Acceso seguro", text: "Sesión por usuario y permisos por rol." },
];

function PasswordField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="input-icon">
      <Icon name="lock" size={16} className="input-icon-lead" />
      <input
        type={visible ? "text" : "password"}
        autoComplete="current-password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="••••••••"
        disabled={disabled}
      />
      <button
        type="button"
        className="input-icon-action"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
      >
        <Icon name={visible ? "eye-off" : "eye"} size={16} />
      </button>
    </div>
  );
}

export function LoginScreen({
  projectCount,
  onLogin,
  error,
  loading,
  twoFactor,
  onVerifyTwoFactor,
  onResendTwoFactor,
  onCancelTwoFactor,
}: {
  projectCount: number;
  onLogin: (username: string, password: string) => void;
  error: string | null;
  loading: boolean;
  twoFactor: TwoFactorChallenge | null;
  onVerifyTwoFactor: (code: string) => void;
  onResendTwoFactor: () => void;
  onCancelTwoFactor: () => void;
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
        <span className="login-blob login-blob-1" aria-hidden="true" />
        <span className="login-blob login-blob-2" aria-hidden="true" />
        <span className="login-grid" aria-hidden="true" />
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
          <ul className="login-features">
            {LOGIN_FEATURES.map((f) => (
              <li key={f.title}>
                <span className="login-feature-icon">
                  <Icon name={f.icon} size={16} />
                </span>
                <span>
                  <strong>{f.title}</strong>
                  <small>{f.text}</small>
                </span>
              </li>
            ))}
          </ul>
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
          <span className="status-dot">Sistema operativo · {SYSTEM_VERSION}</span>
        </div>
        {twoFactor ? (
          <div className="login-form">
            <TwoFactorCodeForm
              eyebrow="Verificación en dos pasos"
              title="Revisa tu correo."
              description={`Te enviamos un código de 6 dígitos a ${twoFactor.emailHint}.`}
              cooldownSeconds={twoFactor.cooldownSeconds}
              loading={loading}
              error={error}
              onSubmit={onVerifyTwoFactor}
              onResend={onResendTwoFactor}
              onCancel={onCancelTwoFactor}
              submitLabel="Entrar"
            />
          </div>
        ) : (
          <form className="login-form form" onSubmit={submit}>
            <p className="eyebrow">Bienvenido</p>
            <h2>Inicia sesión para continuar.</h2>
            <p className="login-form-lead">
              Entra con tu usuario y contraseña para gestionar proyectos, equipo y fechas clave.
            </p>

            {error && (
              <p key={error} className="form-error form-error-shake" role="alert">
                <Icon name="alert" size={15} />
                {error}
              </p>
            )}

            <div className="form-row">
              <span>Usuario</span>
              <div className="input-icon">
                <Icon name="user" size={16} className="input-icon-lead" />
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
            </div>
            <div className="form-row">
              <span>Contraseña</span>
              <PasswordField value={password} onChange={setPassword} disabled={loading} />
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
        )}
      </section>
    </main>
  );
}
