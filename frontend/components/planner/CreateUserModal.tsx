"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { fieldError, ValidatedField, type Rule } from "@/components/ui/ValidatedField";
import { friendlyError } from "@/lib/errors";
import type { ManagedUser } from "@/lib/types";

type Role = "architect" | "civil";

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "architect", label: "Arquitecto" },
  { value: "civil", label: "Civil" },
];

const nameRules: Rule[] = [
  { label: "Obligatorio", test: (v) => v.trim().length > 0 },
  { label: "Máximo 300 caracteres", test: (v) => v.trim().length <= 300 },
  { label: "Sin los símbolos < o >", test: (v) => !/[<>]/.test(v) },
];

/** Igual que src/lib/auth.ts `slugifyUsername`: solo para mostrar la vista previa. */
function previewUsername(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "");
}

export function CreateUserModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (data: { firstName: string; lastName: string; role: Role; password: string }) => Promise<ManagedUser>;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role>("architect");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<ManagedUser | null>(null);

  const username = previewUsername(firstName);
  const step1Invalid = fieldError(firstName, nameRules) !== null || fieldError(lastName, nameRules) !== null;
  const step2Invalid = !password.trim() || password !== confirmPassword;

  function goToPassword(event: React.FormEvent) {
    event.preventDefault();
    if (step1Invalid) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep(2);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (step2Invalid) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    try {
      const user = await onSubmit({ firstName: firstName.trim(), lastName: lastName.trim(), role, password });
      setCreated(user);
    } catch (submitError) {
      setError(friendlyError(submitError));
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    return (
      <Modal eyebrow="Usuarios" title="Cuenta creada" onClose={onClose}>
        <div className="form">
          <p className="hero-lead">
            La cuenta de <strong>{created.name}</strong> ({created.roleLabel}) ya está lista. Comparte estas
            credenciales con la persona correspondiente — no se volverán a mostrar aquí.
          </p>
          <div className="form-row">
            <span>Usuario</span>
            <input type="text" value={created.username} readOnly />
          </div>
          <div className="form-row">
            <span>Contraseña</span>
            <input type="text" value={password} readOnly />
          </div>
          <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
            Listo
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      eyebrow="Usuarios"
      title={step === 1 ? "Nuevo usuario · Datos personales" : "Nuevo usuario · Contraseña"}
      description={step === 1 ? "Paso 1 de 2" : "Paso 2 de 2"}
      onClose={onClose}
    >
      {step === 1 ? (
        <form className="form" onSubmit={goToPassword} noValidate>
          <ValidatedField
            label="Nombre"
            example="Jorge"
            rules={nameRules}
            value={firstName}
            onChange={setFirstName}
            showErrors={showErrors}
          />
          <ValidatedField
            label="Apellido"
            example="Peña"
            rules={nameRules}
            value={lastName}
            onChange={setLastName}
            showErrors={showErrors}
          />
          <div className="form-row">
            <span>Rol</span>
            <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {username && (
            <p className="hero-lead">
              Su usuario para iniciar sesión será: <strong>{username}</strong>
            </p>
          )}
          {showErrors && step1Invalid && <p className="form-error">Completa el nombre y el apellido.</p>}
          <button type="submit" className="btn btn-primary btn-block">
            Continuar
            <Icon name="arrow-right" size={16} />
          </button>
        </form>
      ) : (
        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              autoFocus
            />
          </div>
          <div className="form-row">
            <span>Confirmar contraseña</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>
          {showErrors && !password.trim() && <p className="form-error">Escribe una contraseña.</p>}
          {showErrors && password.trim() && password !== confirmPassword && (
            <p className="form-error">Las contraseñas no coinciden.</p>
          )}
          {error && <p className="form-error">{error}</p>}
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button type="button" className="btn btn-secondary" onClick={() => setStep(1)} disabled={saving}>
              <Icon name="arrow-left" size={16} />
              Atrás
            </button>
            <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
              {saving ? "Creando…" : "Crear usuario"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
