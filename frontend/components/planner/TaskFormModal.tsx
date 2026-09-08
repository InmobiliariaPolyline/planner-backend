"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { friendlyError } from "@/lib/errors";
import { SelectOrCreate } from "@/components/ui/SelectOrCreate";
import { fieldError, ValidatedField, type Rule } from "@/components/ui/ValidatedField";
import { api } from "@/lib/api";
import { isoDay } from "@/lib/format";
import type { TaskDetail, TaskFormValues, TechnicalArea } from "@/lib/types";

const notEmpty = (v: string) => v.trim().length > 0;
const maxLen = (v: string) => v.trim().length <= 300;
const noAngles = (v: string) => !/[<>]/.test(v);
const validDate = (v: string) => v === "" || !Number.isNaN(Date.parse(v));
const isNumber = (v: string) => v.trim() === "" || Number.isFinite(Number(v));
const isInteger = (v: string) => v.trim() === "" || /^\d+$/.test(v.trim());
const isHttpUrl = (v: string) => v.trim() === "" || /^https?:\/\/\S+/i.test(v.trim());

const textRules: Rule[] = [
  { label: "Obligatorio", test: notEmpty },
  { label: "Máximo 300 caracteres", test: maxLen },
  { label: "Sin los símbolos < o >", test: noAngles },
];
const optionalTextRules: Rule[] = [
  { label: "Máximo 300 caracteres", test: maxLen },
  { label: "Sin los símbolos < o >", test: noAngles },
];
const unitRules: Rule[] = textRules;
const rateRules: Rule[] = [
  { label: "Obligatorio", test: notEmpty },
  { label: "Solo números", test: isNumber },
  { label: "Mayor o igual a 0", test: (v) => v.trim() === "" || Number(v) >= 0 },
];
const divisorRules: Rule[] = [
  { label: "Obligatorio", test: notEmpty },
  { label: "Número entero", test: isInteger },
  { label: "Mayor o igual a 1", test: (v) => v.trim() === "" || Number(v) >= 1 },
];
const urlRules: Rule[] = [
  { label: "Obligatorio", test: notEmpty },
  { label: "Debe empezar por http:// o https://", test: isHttpUrl },
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
  const [metricErrors, setMetricErrors] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkErrors, setLinkErrors] = useState(false);
  const [error, setError] = useState("");

  const metricInvalid =
    fieldError(metricUnit, unitRules) !== null ||
    fieldError(metricRate, rateRules) !== null ||
    fieldError(metricDivisor, divisorRules) !== null;
  const linkInvalid = fieldError(linkUrl, urlRules) !== null;

  async function run(action: () => Promise<unknown>) {
    setError("");
    try {
      await action();
      onChanged();
    } catch (actionError) {
      setError(friendlyError(actionError));
    }
  }

  function addMetric() {
    if (metricInvalid) {
      setMetricErrors(true);
      return;
    }
    run(async () => {
      await api.createMetric(task.id, {
        unit: metricUnit.trim(),
        ratePerDay: Number(metricRate),
        divisor: Number(metricDivisor) || 1,
      });
      setMetricUnit("");
      setMetricRate("");
      setMetricDivisor("1");
      setMetricErrors(false);
    });
  }

  function addLink() {
    if (linkInvalid) {
      setLinkErrors(true);
      return;
    }
    run(async () => {
      await api.createDriveLink(task.id, linkUrl.trim());
      setLinkUrl("");
      setLinkErrors(false);
    });
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
        <div className="form">
          <ValidatedField
            label="Unidad"
            example="m³, ml, kg"
            rules={unitRules}
            value={metricUnit}
            onChange={setMetricUnit}
            showErrors={metricErrors}
            placement="top"
          />
          <div className="form-grid">
            <ValidatedField
              label="Ritmo por día"
              type="number"
              inputMode="decimal"
              min="0"
              example="120"
              rules={rateRules}
              value={metricRate}
              onChange={setMetricRate}
              showErrors={metricErrors}
              placement="top"
            />
            <ValidatedField
              label="Divisor"
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              example="1"
              rules={divisorRules}
              value={metricDivisor}
              onChange={setMetricDivisor}
              showErrors={metricErrors}
              placement="top"
              align="right"
            />
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addMetric}>
            <Icon name="plus" size={14} />
            Añadir métrica
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
        <div className="form">
          <ValidatedField
            label="Dirección del enlace"
            type="url"
            example="https://drive.google.com/…"
            rules={urlRules}
            value={linkUrl}
            onChange={setLinkUrl}
            showErrors={linkErrors}
            placement="top"
          />
          <button type="button" className="btn btn-secondary btn-sm" onClick={addLink}>
            <Icon name="plus" size={14} />
            Añadir enlace
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
    fieldError(values.dependency, optionalTextRules) !== null ||
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
      setError(friendlyError(submitError));
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
          example="Obra civil, Estructura, Instalaciones"
          options={technicalAreas.map((area) => ({ id: area.id, label: area.name }))}
          value={values.technicalAreaId}
          onChange={(id) => set("technicalAreaId", id)}
          onCreate={async (name) => {
            const area = await onCreateArea(name);
            return { id: area.id, label: area.name };
          }}
          placeholderOption="Selecciona un área"
          newPlaceholder="Nombre del área (Obra civil…)"
          required
          showErrors={showErrors}
        />
        <div className="form-grid">
          <ValidatedField
            label="Depende de (opcional)"
            example="Movimiento de tierras"
            rules={optionalTextRules}
            value={values.dependency}
            onChange={(v) => set("dependency", v)}
            showErrors={showErrors}
            placement="top"
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={values.isPhase}
              onChange={(e) => set("isPhase", e.target.checked)}
            />
            <span>Es una fase</span>
          </label>
        </div>

        {showErrors && invalid && <p className="form-error">Revisa los campos marcados en rojo.</p>}
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
