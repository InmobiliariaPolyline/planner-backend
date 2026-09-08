"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { friendlyError } from "@/lib/errors";
import { fieldError, ValidatedField, type Rule } from "@/components/ui/ValidatedField";
import { isoDay } from "@/lib/format";
import type { Milestone } from "@/lib/types";

const descRules: Rule[] = [
  { label: "Obligatorio", test: (v) => v.trim().length > 0 },
  { label: "Máximo 300 caracteres", test: (v) => v.trim().length <= 300 },
  { label: "Sin los símbolos < o >", test: (v) => !/[<>]/.test(v) },
];
const dateRules: Rule[] = [
  { label: "Obligatorio", test: (v) => v.trim().length > 0 },
  { label: "Fecha válida", test: (v) => v === "" || !Number.isNaN(Date.parse(v)) },
];

export function MilestoneFormModal({
  milestone,
  onSubmit,
  onClose,
}: {
  milestone?: Milestone;
  onSubmit: (data: { description: string; date: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(milestone?.description ?? "");
  const [date, setDate] = useState(milestone ? isoDay(milestone.date) : "");
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState("");

  const invalid = fieldError(description, descRules) !== null || fieldError(date, dateRules) !== null;
  const isEdit = Boolean(milestone);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (invalid) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ description: description.trim(), date });
    } catch (submitError) {
      setError(friendlyError(submitError));
      setSaving(false);
    }
  }

  return (
    <Modal
      eyebrow="Fechas clave"
      title={isEdit ? "Editar hito" : "Añadir hito"}
      onClose={onClose}
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        <ValidatedField
          label="Descripción"
          example="Entrega de cimentación"
          rules={descRules}
          value={description}
          onChange={setDescription}
          showErrors={showErrors}
        />
        <ValidatedField
          label="Fecha"
          type="date"
          example="2026-06-05"
          rules={dateRules}
          value={date}
          onChange={setDate}
          showErrors={showErrors}
        />
        {showErrors && invalid && <p className="form-error">Completa la descripción y la fecha.</p>}
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Añadir hito"}
        </button>
      </form>
    </Modal>
  );
}
