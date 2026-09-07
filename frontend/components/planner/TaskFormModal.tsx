"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { SelectOrCreate } from "@/components/ui/SelectOrCreate";
import { fieldError, ValidatedField, type Rule } from "@/components/ui/ValidatedField";
import { api } from "@/lib/api";
import { isoDay } from "@/lib/format";
import type { TaskDetail, TaskFormValues, TechnicalArea } from "@/lib/types";

const notEmpty = (v: string) => v.trim().length > 0;
const maxLen = (v: string) => v.trim().length <= 300;
const noAngles = (v: string) => !/[<>]/.test(v);
const validDate = (v: string) => v === "" || !Number.isNaN(Date.parse(v));
const textRules: Rule[] = [
  { label: "Obligatorio", test: notEmpty },
  { label: "Máximo 300 caracteres", test: maxLen },
  { label: "Sin los símbolos < o >", test: noAngles },
];

const EMPTY: TaskFormValues = {
  name: "",
  ownerName: "",
  startDate: "",
  endDate: "",
  technicalAreaId: "",
  isPhase: false,
  dependency: "",
};

export function taskToForm(task: TaskDetail): TaskFormValues {
  return {
    name: task.name,
    ownerName: task.ownerName,
    startDate: isoDay(task.startDate),
    endDate: isoDay(task.endDate),
    technicalAreaId: task.technicalAreaId,
    isPhase: task.isPhase,
    dependency: task.dependency ?? "",
  };
}

function MetricsAndLinks({ task, onChanged }: { task: TaskDetail; onChanged: () => void }) {
  const [metricUnit, setMetricUnit] = useState("");
  const [metricRate, setMetricRate] = useState("");
  const [metricDivisor, setMetricDivisor] = useState("1");
  const [linkUrl, setLinkUrl] = useState("");
  const [error, setError] = useState("");

  async function run(action: () => Promise<unknown>) {
    setError("");
    try {
      await action();
      onChanged();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "No fue posible completar la acción");
    }
  }

  return (
    <div className="task-extras">
      <div className="task-extra">
        <h3>Métricas de rendimiento</h3>
        <ul className="chip-list">
          {(task.performanceMetrics ?? []).map((metric) => (
            <li key={metric.id}>
              <span>
                {metric.unit} · {metric.ratePerDay}/día ÷ {metric.divisor}
              </span>
              <button type="button" onClick={() => run(() => api.deleteMetric(metric.id))} aria-label="Eliminar métrica">
                <Icon name="x" size={13} />
              </button>
            </li>
          ))}
          {!(task.performanceMetrics ?? []).length && <li className="muted">Sin métricas.</li>}
        </ul>
        <div className="task-extra-add">
          <input placeholder="Unidad (m³, ml…)" value={metricUnit} onChange={(e) => setMetricUnit(e.target.value)} />
          <input placeholder="Ritmo/día" inputMode="decimal" value={metricRate} onChange={(e) => setMetricRate(e.target.value)} />
          <input placeholder="Divisor" inputMode="numeric" value={metricDivisor} onChange={(e) => setMetricDivisor(e.target.value)} />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() =>
              run(async () => {
                await api.createMetric(task.id, {
                  unit: metricUnit.trim(),
                  ratePerDay: Number(metricRate),
                  divisor: Number(metricDivisor) || 1,
                });
                setMetricUnit("");
                setMetricRate("");
                setMetricDivisor("1");
              })
            }
          >
            Añadir
          </button>
        </div>
      </div>

      <div className="task-extra">
        <h3>Enlaces de Drive</h3>
        <ul className="chip-list">
          {(task.driveLinks ?? []).map((link) => (
            <li key={link.id}>
              <a href={link.url} target="_blank" rel="noreferrer noopener">
                {link.url}
              </a>
              <button type="button" onClick={() => run(() => api.deleteDriveLink(link.id))} aria-label="Eliminar enlace">
                <Icon name="x" size={13} />
              </button>
            </li>
          ))}
          {!(task.driveLinks ?? []).length && <li className="muted">Sin enlaces.</li>}
        </ul>
        <div className="task-extra-add">
          <input placeholder="https://drive.google.com/…" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() =>
              run(async () => {
                await api.createDriveLink(task.id, linkUrl.trim());
                setLinkUrl("");
              })
            }
          >
            Añadir
          </button>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

export function TaskFormModal({
  mode,
  initialTask,
  technicalAreas,
  onCreateArea,
  onSubmit,
  onExtrasChanged,
  onClose,
}: {
  mode: "create" | "edit";
  initialTask?: TaskDetail;
  technicalAreas: TechnicalArea[];
  onCreateArea: (name: string) => Promise<TechnicalArea>;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onExtrasChanged?: () => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<TaskFormValues>(
    initialTask ? taskToForm(initialTask) : EMPTY,
  );
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState("");
  const isEdit = mode === "edit";

  const set = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const invalid =
    fieldError(values.name, textRules) !== null ||
    fieldError(values.ownerName, textRules) !== null ||
    !values.startDate ||
    !values.endDate ||
    !validDate(values.startDate) ||
    !validDate(values.endDate) ||
    values.endDate < values.startDate ||
    !values.technicalAreaId;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (invalid) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    try {
      await onSubmit(values);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No fue posible guardar");
      setSaving(false);
    }
  }

  return (
    <Modal
      eyebrow={isEdit ? "Editar tarea" : "Nueva tarea"}
      title={isEdit ? values.name || "Tarea" : "Añadir tarea al cronograma"}
      onClose={onClose}
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        <ValidatedField
          label="Nombre de la tarea"
          example="Movimiento de tierras"
          rules={textRules}
          value={values.name}
          onChange={(v) => set("name", v)}
          showErrors={showErrors}
        />
        <div className="form-grid">
          <ValidatedField
            label="Fecha de inicio"
            type="date"
            example="2026-03-01"
            rules={[
              { label: "Obligatorio", test: notEmpty },
              { label: "Fecha válida", test: validDate },
            ]}
            value={values.startDate}
            onChange={(v) => set("startDate", v)}
            showErrors={showErrors}
          />
          <ValidatedField
            label="Fecha de término"
            type="date"
            example="2026-04-10"
            align="right"
            rules={[
              { label: "Obligatorio", test: notEmpty },
              { label: "Fecha válida", test: validDate },
              {
                label: "No anterior al inicio",
                test: (v) => v === "" || values.startDate === "" || v >= values.startDate,
              },
            ]}
            value={values.endDate}
            onChange={(v) => set("endDate", v)}
            showErrors={showErrors}
          />
        </div>
        <ValidatedField
          label="Responsable"
          example="Cuadrilla A"
          rules={textRules}
          value={values.ownerName}
          onChange={(v) => set("ownerName", v)}
          showErrors={showErrors}
        />
        <SelectOrCreate
          label="Área técnica"
          options={technicalAreas.map((area) => ({ id: area.id, label: area.name }))}
          value={values.technicalAreaId}
          onChange={(id) => set("technicalAreaId", id)}
          onCreate={async (name) => {
            const area = await onCreateArea(name);
            return { id: area.id, label: area.name };
          }}
          placeholderOption="Selecciona un área"
          newPlaceholder="Nombre del área (Obra civil…)"
        />
        <div className="form-grid">
          <label className="form-row">
            <span>Depende de (opcional)</span>
            <input value={values.dependency} onChange={(e) => set("dependency", e.target.value)} />
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={values.isPhase}
              onChange={(e) => set("isPhase", e.target.checked)}
            />
            <span>Es una fase</span>
          </label>
        </div>

        {showErrors && invalid && <p className="form-error">Revisa los campos obligatorios.</p>}
        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
          {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear tarea"}
        </button>
      </form>

      {isEdit && initialTask && (
        <MetricsAndLinks task={initialTask} onChanged={() => onExtrasChanged?.()} />
      )}
    </Modal>
  );
}
