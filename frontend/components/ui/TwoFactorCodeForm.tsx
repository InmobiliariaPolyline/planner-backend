"use client";

import { useEffect, useState } from "react";

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Ingreso del código de 6 dígitos + cuenta regresiva en vivo para reenviar. */
export function TwoFactorCodeForm({
  eyebrow,
  title,
  description,
  cooldownSeconds,
  loading,
  error,
  onSubmit,
  onResend,
  onCancel,
  submitLabel = "Verificar código",
}: {
  eyebrow: string;
  title: string;
  description: string;
  cooldownSeconds: number;
  loading: boolean;
  error?: string | null;
  onSubmit: (code: string) => void;
  onResend: () => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [code, setCode] = useState("");
  const [remaining, setRemaining] = useState(cooldownSeconds);
  // Reinicia la cuenta regresiva cuando el padre emite un nuevo cooldown (p.
  // ej. tras reenviar), sin pasar por un efecto: se ajusta durante el
  // render, como recomienda React para "resetear estado cuando cambia una prop".
  const [trackedCooldown, setTrackedCooldown] = useState(cooldownSeconds);
  if (cooldownSeconds !== trackedCooldown) {
    setTrackedCooldown(cooldownSeconds);
    setRemaining(cooldownSeconds);
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault();
        if (code.length === 6) onSubmit(code);
      }}
      noValidate
    >
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p className="hero-lead">{description}</p>

      <div className="form-row">
        <span>Código de 6 dígitos</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          autoFocus
          style={{ letterSpacing: "0.3em", fontVariantNumeric: "tabular-nums", textAlign: "center" }}
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="btn btn-primary btn-block" disabled={loading || code.length !== 6}>
        {loading ? "Verificando…" : submitLabel}
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {onCancel ? (
          <button type="button" className="link-btn" onClick={onCancel}>
            Cancelar
          </button>
        ) : (
          <span />
        )}
        <button type="button" className="link-btn" onClick={onResend} disabled={remaining > 0}>
          {remaining > 0 ? `Reenviar en ${formatCountdown(remaining)}` : "Reenviar código"}
        </button>
      </div>
    </form>
  );
}
