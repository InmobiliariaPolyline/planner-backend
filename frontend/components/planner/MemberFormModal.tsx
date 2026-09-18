"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { friendlyError } from "@/lib/errors";
import { SelectOrCreate } from "@/components/ui/SelectOrCreate";
import type { BasicUser, TeamStatusOption } from "@/lib/types";

/** Desplegable de selección múltiple, con el mismo aspecto que un select normal. */
function MemberMultiSelect({
  options,
  selected,
  onToggle,
  showErrors,
}: {
  options: BasicUser[];
  selected: string[];
  onToggle: (id: string) => void;
  showErrors: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const invalid = showErrors && selected.length === 0;

  useEffect(() => {
    if (!open) return;
    const onOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const summary =
    selected.length === 0
      ? "Selecciona uno o varios…"
      : selected.length === 1
        ? options.find((option) => option.id === selected[0])?.name ?? "1 seleccionado"
        : `${selected.length} integrantes seleccionados`;

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        style={{
          width: "100%",
          height: 40,
          padding: "0 var(--space-3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-2)",
          border: `1px solid ${invalid ? "var(--danger)" : "var(--border-strong)"}`,
          borderRadius: "var(--radius-sm)",
          background: "var(--surface)",
          color: selected.length ? "var(--text)" : "var(--text-muted)",
          font: "inherit",
          cursor: "pointer",
          transition: "border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease)",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summary}</span>
        <span
          style={{
            display: "inline-flex",
            transition: "transform var(--dur) var(--ease-out)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <Icon name="chevron-down" size={16} />
        </span>
      </button>

      {open && (
        <div className="vfield-pop place-bottom align-left" style={{ maxWidth: "none" }} role="listbox">
          {options.length === 0 ? (
            <p className="vfield-example" style={{ margin: 0 }}>
              No hay cuentas disponibles: todas ya son participantes de este expediente, o no hay
              cuentas creadas todavía.
            </p>
          ) : (
            <ul style={{ display: "grid", gap: 2, maxHeight: 220, overflowY: "auto" }}>
              {options.map((account) => {
                const checked = selected.includes(account.id);
                return (
                  <li key={account.id}>
                    <label
                      className="member-option"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        padding: "var(--space-2)",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        fontSize: "var(--text-sm)",
                        color: "var(--text)",
                      }}
                    >
                      <input type="checkbox" checked={checked} onChange={() => onToggle(account.id)} />
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
      )}
    </div>
  );
}

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
          <MemberMultiSelect options={available} selected={selected} onToggle={toggle} showErrors={showErrors} />
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
