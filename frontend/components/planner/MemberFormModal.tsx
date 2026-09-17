"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { friendlyError } from "@/lib/errors";
import { SelectOrCreate } from "@/components/ui/SelectOrCreate";
import { fieldError, ValidatedField, type Rule } from "@/components/ui/ValidatedField";
import type { BasicUser, TeamStatusOption } from "@/lib/types";

const textRules: Rule[] = [
  { label: "Obligatorio", test: (v) => v.trim().length > 0 },
  { label: "Máximo 300 caracteres", test: (v) => v.trim().length <= 300 },
  { label: "Sin los símbolos < o >", test: (v) => !/[<>]/.test(v) },
];

export function MemberFormModal({
  statuses,
  accounts = [],
  onCreateStatus,
  onSubmit,
  onClose,
}: {
  statuses: TeamStatusOption[];
  /** Cuentas del sistema a las que se puede vincular el participante (opcional). */
  accounts?: BasicUser[];
  onCreateStatus: (type: string) => Promise<TeamStatusOption>;
  onSubmit: (data: { name: string; teamStatusId: string; userId?: string | null }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [statusId, setStatusId] = useState(statuses[0]?.id ?? "");
  const [userId, setUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState("");

  const invalid = fieldError(name, textRules) !== null || !statusId;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (invalid) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ name: name.trim(), teamStatusId: statusId, userId: userId || null });
    } catch (submitError) {
      setError(friendlyError(submitError));
      setSaving(false);
    }
  }

  return (
    <Modal eyebrow="Equipo del proyecto" title="Añadir participante" onClose={onClose}>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <ValidatedField
          label="Nombre"
          example="Jorge Peña"
          rules={textRules}
          value={name}
          onChange={setName}
          showErrors={showErrors}
        />
        <SelectOrCreate
          label="Estado en el equipo"
          example="Activo, Inactivo, De baja"
          options={statuses.map((status) => ({ id: status.id, label: status.type }))}
          value={statusId}
          onChange={setStatusId}
          onCreate={async (type) => {
            const status = await onCreateStatus(type);
            return { id: status.id, label: status.type };
          }}
          placeholderOption="Selecciona un estado"
          newPlaceholder="Nombre del estado (Activo…)"
          required
          showErrors={showErrors}
        />
        {accounts.length > 0 && (
          <div className="form-row">
            <span>Cuenta del sistema (opcional)</span>
            <select value={userId} onChange={(event) => setUserId(event.target.value)}>
              <option value="">Ninguna — solo un nombre</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.roleLabel})
                </option>
              ))}
            </select>
            <p className="hero-lead" style={{ marginTop: "var(--space-1)" }}>
              Si vinculas una cuenta, esa persona podrá ver este expediente al iniciar sesión.
            </p>
          </div>
        )}
        {showErrors && invalid && <p className="form-error">Completa el nombre y el estado.</p>}
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving ? "Guardando…" : "Añadir participante"}
        </button>
      </form>
    </Modal>
  );
}
