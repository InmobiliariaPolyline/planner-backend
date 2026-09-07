"use client";

import { useState } from "react";
import { Icon } from "./Icon";

/** Select de opciones + posibilidad de crear una nueva ahí mismo. */
export function SelectOrCreate({
  label,
  options,
  value,
  onChange,
  onCreate,
  placeholderOption = "Selecciona…",
  newPlaceholder = "Nombre",
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  onCreate: (name: string) => Promise<{ id: string; label: string }>;
  placeholderOption?: string;
  newPlaceholder?: string;
}) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    if (!draft.trim()) return;
    setBusy(true);
    setError("");
    try {
      const option = await onCreate(draft.trim());
      onChange(option.id);
      setDraft("");
      setCreating(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No fue posible crear");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="form-row">
      <span>{label}</span>
      {creating ? (
        <div className="inline-create">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={newPlaceholder}
            autoFocus
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={create} disabled={busy}>
            {busy ? "…" : "Crear"}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setCreating(false);
              setError("");
            }}
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div className="inline-create">
          <select value={value} onChange={(event) => onChange(event.target.value)}>
            <option value="">{placeholderOption}</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCreating(true)}>
            <Icon name="plus" size={14} />
            Nuevo
          </button>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
