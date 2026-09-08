"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { friendlyError } from "@/lib/errors";
import { SelectOrCreate } from "@/components/ui/SelectOrCreate";
import { fieldError, ValidatedField, type Rule } from "@/components/ui/ValidatedField";
import type { TeamStatusOption } from "@/lib/types";

const textRules: Rule[] = [
  { label: "Obligatorio", test: (v) => v.trim().length > 0 },
  { label: "Máximo 300 caracteres", test: (v) => v.trim().length <= 300 },
  { label: "Sin los símbolos < o >", test: (v) => !/[<>]/.test(v) },
];

export function MemberFormModal({
  statuses,
  onCreateStatus,
  onSubmit,
  onClose,
}: {
  statuses: TeamStatusOption[];
  onCreateStatus: (type: string) => Promise<TeamStatusOption>;
  onSubmit: (data: { name: string; teamStatusId: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [statusId, setStatusId] = useState(statuses[0]?.id ?? "");
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
      await onSubmit({ name: name.trim(), teamStatusId: statusId });
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
        {showErrors && invalid && <p className="form-error">Completa el nombre y el estado.</p>}
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving ? "Guardando…" : "Añadir participante"}
        </button>
      </form>
    </Modal>
  );
}
