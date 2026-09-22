"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { friendlyError } from "@/lib/errors";
import { SelectOrCreate } from "@/components/ui/SelectOrCreate";
import { fieldError, ValidatedField, type Rule } from "@/components/ui/ValidatedField";
import { api } from "@/lib/api";
import { isoDay } from "@/lib/format";
import { formatMaterialValues, metricComponents } from "@/lib/materials";
import type { Material, TaskDetail, TaskFormValues, TechnicalArea } from "@/lib/types";

const notEmpty = (v: string) => v.trim().length > 0;
const maxLen = (v: string) => v.trim().length <= 300;
const noAngles = (v: string) => !/[<>]/.test(v);
const validDate = (v: string) => v === "" || !Number.isNaN(Date.parse(v));
const isNumber = (v: string) => v.trim() === "" || Number.isFinite(Number(v));
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
const metricValueRules: Rule[] = [
  { label: "Obligatorio", test: notEmpty },
  { label: "Solo números", test: isNumber },
  { label: "Mayor que 0", test: (v) => v.trim() === "" || Number(v) > 0 },
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

/** Un material elegido en el formulario de creación, antes de que la tarea
 * exista (se envía al backend justo después de crear la tarea). */
export type PendingMaterial = { key: string; materialId: string; values: Record<string, number>; material: Material };

/** Fila común para mostrar un material elegido, sea ya guardado (edición) o
 * pendiente de guardar (creación). */
type MaterialRow = { id: string; values: Record<string, number>; material: Material };

let pendingKeySeq = 0;

/** Selector de materiales del catálogo: categoría → material → un valor por
 * cada dato que pide su métrica (p. ej. "Peso (kg)" y "Longitud (m)" por
 * separado). Cada material tiene su propia densidad y métrica, aunque
 * comparta categoría con otro ya elegido; por eso cada selección es una fila
 * independiente y nunca se combinan entre sí. */
function MaterialPicker({
  catalog,
  onAdd,
}: {
  catalog: Material[];
  onAdd: (materialId: string, values: Record<string, number>) => void;
}) {
  const categories = useMemo(
    () => Array.from(new Set(catalog.map((m) => m.category))).sort((a, b) => a.localeCompare(b, "es")),
    [catalog],
  );
  const [category, setCategory] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [valueInputs, setValueInputs] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);

  const materialsInCategory = useMemo(
    () => catalog.filter((m) => m.category === category).sort((a, b) => a.name.localeCompare(b.name, "es")),
    [catalog, category],
  );
  const selected = catalog.find((m) => m.id === materialId) ?? null;
  const components = selected ? metricComponents(selected.metricLabel) : [];
  const invalid = !materialId || components.some((c) => fieldError(valueInputs[c] ?? "", metricValueRules) !== null);

  function add() {
    if (invalid) {
      setShowErrors(true);
      return;
    }
    const values: Record<string, number> = {};
    for (const component of components) values[component] = Number(valueInputs[component]);
    onAdd(materialId, values);
    setMaterialId("");
    setValueInputs({});
    setShowErrors(false);
  }

  return (
    <div className="form">
      <div className="form-row">
        <span>Categoría de material</span>
        <select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setMaterialId("");
            setValueInputs({});
          }}
        >
          <option value="">Selecciona una categoría</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
      {category && (
        <div className="form-row">
          <span>Material</span>
          <select
            value={materialId}
            onChange={(event) => {
              setMaterialId(event.target.value);
              setValueInputs({});
              setShowErrors(false);
            }}
          >
            <option value="">Selecciona un material</option>
            {materialsInCategory.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {selected && (
        <>
          <p className="hero-lead" style={{ margin: 0 }}>
            Densidad de referencia: {selected.density} kg/m³ · Métrica: {selected.metricLabel}
          </p>
          <div className="form-grid">
            {components.map((component) => (
              <ValidatedField
                key={component}
                label={component}
                type="number"
                inputMode="decimal"
                min="0"
                example="12.5"
                rules={metricValueRules}
                value={valueInputs[component] ?? ""}
                onChange={(v) => setValueInputs((current) => ({ ...current, [component]: v }))}
                showErrors={showErrors}
                placement="top"
              />
            ))}
          </div>
        </>
      )}
      <button type="button" className="btn btn-secondary btn-sm" onClick={add}>
        <Icon name="plus" size={14} />
        Añadir material
      </button>
    </div>
  );
}

function MaterialsList({ rows, onRemove }: { rows: MaterialRow[]; onRemove: (id: string) => void }) {
  return (
    <ul className="chip-list">
      {rows.map((row) => (
        <li key={row.id}>
          <span>
            {row.material.category} · {row.material.name} — {formatMaterialValues(row.values)} (
            {row.material.density} kg/m³ ref.)
          </span>
          <button type="button" onClick={() => onRemove(row.id)} aria-label="Quitar material">
            <Icon name="x" size={13} />
          </button>
        </li>
      ))}
      {!rows.length && <li className="muted">Sin materiales.</li>}
    </ul>
  );
}

function TaskExtras({ task, onChanged }: { task: TaskDetail; onChanged: () => void }) {
  const [catalog, setCatalog] = useState<Material[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkErrors, setLinkErrors] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listMaterials().then(setCatalog).catch((loadError) => setError(friendlyError(loadError)));
  }, []);

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

  const materialRows: MaterialRow[] = (task.taskMaterials ?? []).map((tm) => ({
    id: tm.id,
    values: tm.values,
    material: tm.material,
  }));

  return (
    <div className="task-extras">
      <div className="task-extra">
        <h3>Materiales</h3>
        <MaterialsList rows={materialRows} onRemove={(id) => run(() => api.deleteTaskMaterial(id))} />
        <MaterialPicker
          catalog={catalog}
          onAdd={(materialId, values) => run(() => api.addTaskMaterial(task.id, { materialId, values }))}
        />
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
  onSubmit: (values: TaskFormValues, materials: PendingMaterial[]) => Promise<void>;
  onExtrasChanged?: () => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<TaskFormValues>(
    initialTask ? taskToForm(initialTask) : EMPTY,
  );
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState("");
  const [catalog, setCatalog] = useState<Material[]>([]);
  const [pendingMaterials, setPendingMaterials] = useState<PendingMaterial[]>([]);
  const isEdit = mode === "edit";

  useEffect(() => {
    if (isEdit) return;
    api.listMaterials().then(setCatalog).catch(() => undefined);
  }, [isEdit]);

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
      await onSubmit(values, pendingMaterials);
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

      {!isEdit && (
        <div className="task-extras">
          <div className="task-extra">
            <h3>Materiales</h3>
            <MaterialsList
              rows={pendingMaterials.map((m) => ({ id: m.key, values: m.values, material: m.material }))}
              onRemove={(key) => setPendingMaterials((current) => current.filter((m) => m.key !== key))}
            />
            <MaterialPicker
              catalog={catalog}
              onAdd={(materialId, values) => {
                const material = catalog.find((m) => m.id === materialId);
                if (!material) return;
                setPendingMaterials((current) => [
                  ...current,
                  { key: `pending-${pendingKeySeq++}`, materialId, values, material },
                ]);
              }}
            />
          </div>
        </div>
      )}

      {isEdit && initialTask && (
        <TaskExtras task={initialTask} onChanged={() => onExtrasChanged?.()} />
      )}
    </Modal>
  );
}
