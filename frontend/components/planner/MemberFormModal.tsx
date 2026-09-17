"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { friendlyError } from "@/lib/errors";
import { SelectOrCreate } from "@/components/ui/SelectOrCreate";
import type { BasicUser, TeamStatusOption } from "@/lib/types";

export function MemberFormModal({
  statuses,
  accounts,
  excludeUserIds = [],
  onCreateStatus,
  onSubmit,
  onClose,
}: {
  statuses: TeamStatusOption[];
  /** Cuentas del sistema entre las que elegir (ya son cuentas reales, no texto libre). */
  accounts: BasicUser[];
  /** Cuentas que ya son participantes de este expediente: no se pueden volver a añadir. */
  excludeUserIds?: string[];
  onCreateStatus: (type: string) => Promise<TeamStatusOption>;
  onSubmit: (data: { userIds: string[]; teamStatusId: string }) => Promise<void>;
  onClose: () => void;
}) {
  const available = accounts.filter((account) => !excludeUserIds.includes(account.id));
  const [selected, setSelected] = useState<string[]>([]);
  const [statusId, setStatusId] = useState(statuses[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState("");

  const invalid = selected.length === 0 || !statusId;

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (invalid) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ userIds: selected, teamStatusId: statusId });
    } catch (submitError) {
      setError(friendlyError(submitError));
      setSaving(false);
    }
  }

  return (
    <Modal eyebrow="Equipo del proyecto" title="Añadir participante" onClose={onClose}>
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="form-row">
          <span>Selecciona a uno o varios integrantes</span>
          {available.length === 0 ? (
            <p className="hero-lead">
              No hay cuentas disponibles: todas ya son participantes de este expediente, o no hay
              cuentas creadas todavía.
            </p>
          ) : (
            <ul className="catalog-list">
              {available.map((account) => {
                const checked = selected.includes(account.id);
                return (
                  <li key={account.id}>
                    <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flex: 1, cursor: "pointer" }}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(account.id)} />
                      <span>
                        {account.name} · {account.roleLabel}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

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

        {showErrors && invalid && (
          <p className="form-error">Selecciona al menos un integrante y el estado en el equipo.</p>
        )}
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={saving || available.length === 0}>
          {saving ? "Guardando…" : selected.length > 1 ? `Añadir ${selected.length} participantes` : "Añadir participante"}
        </button>
      </form>
    </Modal>
  );
}
