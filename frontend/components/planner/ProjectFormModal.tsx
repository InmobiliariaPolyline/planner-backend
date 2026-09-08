"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { fieldError, ValidatedField, type Rule } from "@/components/ui/ValidatedField";
import { formatMoney, parseMoney } from "@/lib/money";
import type { Project, ProjectFormValues } from "@/lib/types";

const EMPTY: ProjectFormValues = {
  name: "",
  startDate: "",
  endDate: "",
  ownerName: "",
  budget: "",
};

export function projectToForm(project: Project): ProjectFormValues {
  return {
    name: project.name,
    startDate: project.startDate.slice(0, 10),
    endDate: project.endDate.slice(0, 10),
    ownerName: project.ownerName,
    budget: formatMoney(project.budget),
  };
}

/** Importe del formulario -> número para el backend. */
export function budgetToNumber(value: string): number {
  return parseMoney(value) ?? 0;
}

const notEmpty = (v: string) => v.trim().length > 0;
const maxLen = (v: string) => v.trim().length <= 300;
const noAngles = (v: string) => !/[<>]/.test(v);
const validDate = (v: string) => v === "" || !Number.isNaN(Date.parse(v));

function textRules(): Rule[] {
  return [
    { label: "Obligatorio", test: notEmpty },
    { label: "Máximo 300 caracteres", test: maxLen },
    { label: "Sin los símbolos < o >", test: noAngles },
  ];
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
  const [showErrors, setShowErrors] = useState(false);
  const [serverError, setServerError] = useState("");

  const isEdit = mode === "edit";

  const set = (key: keyof ProjectFormValues) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const rules = useMemo<Record<keyof ProjectFormValues, Rule[]>>(
    () => ({
      name: textRules(),
      ownerName: textRules(),
      startDate: [
        { label: "Obligatorio", test: notEmpty },
        { label: "Fecha válida (AAAA-MM-DD)", test: validDate },
      ],
      endDate: [
        { label: "Obligatorio", test: notEmpty },
        { label: "Fecha válida (AAAA-MM-DD)", test: validDate },
        {
          label: "No puede ser anterior a la fecha de inicio",
          test: (v) => v === "" || values.startDate === "" || v >= values.startDate,
        },
      ],
      budget: [
        { label: "Obligatorio", test: notEmpty },
        { label: "Importe válido (admite 15.000 o 15.000,50)", test: (v) => v.trim() === "" || parseMoney(v) !== null },
        { label: "Mayor o igual a 0", test: (v) => v.trim() === "" || (parseMoney(v) ?? -1) >= 0 },
      ],
    }),
    [values.startDate],
  );

  const formInvalid = (Object.keys(rules) as (keyof ProjectFormValues)[]).some(
    (key) => fieldError(values[key], rules[key]) !== null,
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setServerError("");
    if (formInvalid) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    try {
      await onSubmit(values);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "No fue posible guardar");
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
      <form className="form" onSubmit={handleSubmit} noValidate>
        <ValidatedField
          label="Nombre del proyecto"
          example="Ampliación planta norte"
          rules={rules.name}
          value={values.name}
          onChange={set("name")}
          showErrors={showErrors}
        />
        <div className="form-grid">
          <ValidatedField
            label="Fecha de inicio"
            type="date"
            example="2026-03-01"
            rules={rules.startDate}
            value={values.startDate}
            onChange={set("startDate")}
            showErrors={showErrors}
          />
          <ValidatedField
            label="Fecha de término"
            type="date"
            example="2026-11-30"
            rules={rules.endDate}
            value={values.endDate}
            onChange={set("endDate")}
            showErrors={showErrors}
            align="right"
          />
        </div>
        <ValidatedField
          label="Responsable"
          example="María Fernanda Ruiz"
          rules={rules.ownerName}
          value={values.ownerName}
          onChange={set("ownerName")}
          showErrors={showErrors}
        />
        <ValidatedField
          label="Presupuesto oficial"
          money
          example="4.850.000 · también 15.000,50"
          rules={rules.budget}
          value={values.budget}
          onChange={set("budget")}
          showErrors={showErrors}
          placement="top"
        />

        {serverError && <p className="form-error">{serverError}</p>}
        {showErrors && formInvalid && (
          <p className="form-error">Revisa los campos marcados en rojo.</p>
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear expediente"}
          {!saving && <Icon name="arrow-right" size={16} />}
        </button>
      </form>
    </Modal>
  );
}
