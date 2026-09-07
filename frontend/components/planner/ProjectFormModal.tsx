"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import type { Project, ProjectFormValues } from "@/lib/types";

const EMPTY: ProjectFormValues = {
  name: "",
  startDate: "",
  endDate: "",
  durationMonths: "",
  ownerName: "",
  budget: "",
};

export function projectToForm(project: Project): ProjectFormValues {
  return {
    name: project.name,
    startDate: project.startDate.slice(0, 10),
    endDate: project.endDate.slice(0, 10),
    durationMonths: String(project.durationMonths),
    ownerName: project.ownerName,
    budget: String(project.budget),
  };
}

export function ProjectFormModal({
  mode,
  initialValues,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  initialValues?: ProjectFormValues;
  onClose: () => void;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ProjectFormValues>(initialValues ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEdit = mode === "edit";

  function field<K extends keyof ProjectFormValues>(key: K) {
    return {
      value: values[key],
      onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        setValues((current) => ({ ...current, [key]: event.target.value })),
    };
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit(values);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No fue posible guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      eyebrow={isEdit ? "Editar expediente" : "Nuevo expediente"}
      title={isEdit ? "Actualizar proyecto" : "Crear proyecto"}
      description={
        isEdit
          ? "Los cambios se guardarán en la base de datos."
          : "Registra los datos principales para iniciar la trazabilidad."
      }
      onClose={onClose}
    >
      <form className="form" onSubmit={handleSubmit}>
        <label className="form-row">
          <span>Nombre del proyecto</span>
          <input {...field("name")} required />
        </label>
        <div className="form-grid">
          <label className="form-row">
            <span>Fecha de inicio</span>
            <input type="date" {...field("startDate")} required />
          </label>
          <label className="form-row">
            <span>Fecha de término</span>
            <input type="date" {...field("endDate")} required />
          </label>
        </div>
        <div className="form-grid">
          <label className="form-row">
            <span>Duración (meses)</span>
            <input type="number" min="1" {...field("durationMonths")} required />
          </label>
          <label className="form-row">
            <span>Responsable</span>
            <input {...field("ownerName")} required />
          </label>
        </div>
        <label className="form-row">
          <span>Presupuesto oficial</span>
          <input type="number" min="0" {...field("budget")} required />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear expediente"}
          {!saving && <Icon name="arrow-right" size={16} />}
        </button>
      </form>
    </Modal>
  );
}
