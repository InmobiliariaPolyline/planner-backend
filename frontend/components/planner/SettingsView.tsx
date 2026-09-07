"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/Primitives";
import type { TeamStatusOption, TechnicalArea } from "@/lib/types";

type Item = { id: string; label: string };

function CatalogPanel({
  eyebrow,
  title,
  hint,
  icon,
  placeholder,
  items,
  onCreate,
  onDelete,
}: {
  eyebrow: string;
  title: string;
  hint: string;
  icon: "calendar" | "users";
  placeholder: string;
  items: Item[];
  onCreate: (name: string) => Promise<void>;
  onDelete: (id: string, label: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = draft.trim();
    if (!value) return;
    setBusy(true);
    setError("");
    try {
      await onCreate(value);
      setDraft("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No fue posible crear");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, label: string) {
    setError("");
    try {
      await onDelete(id, label);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "No fue posible eliminar");
    }
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>
            {title} <span className="count">{items.length}</span>
          </h2>
        </div>
        <span className="stat-icon">
          <Icon name={icon} size={16} />
        </span>
      </div>

      <p className="hero-lead" style={{ marginBottom: "var(--space-4)" }}>
        {hint}
      </p>

      {items.length ? (
        <ul className="catalog-list">
          {items.map((item) => (
            <li key={item.id}>
              <span>{item.label}</span>
              <button
                type="button"
                className="row-remove"
                onClick={() => remove(item.id, item.label)}
                aria-label={`Eliminar ${item.label}`}
              >
                <Icon name="trash" size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="catalog-empty">Aún no hay elementos.</p>
      )}

      <form className="catalog-add" onSubmit={submit}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          aria-label={`Nuevo · ${title}`}
        />
        <button type="submit" className="btn btn-primary" disabled={busy}>
          <Icon name="plus" size={15} />
          {busy ? "Añadiendo…" : "Añadir"}
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}
    </section>
  );
}

export function SettingsView({
  technicalAreas,
  teamStatuses,
  onCreateArea,
  onDeleteArea,
  onCreateStatus,
  onDeleteStatus,
}: {
  technicalAreas: TechnicalArea[];
  teamStatuses: TeamStatusOption[];
  onCreateArea: (name: string) => Promise<void>;
  onDeleteArea: (id: string, label: string) => Promise<void>;
  onCreateStatus: (type: string) => Promise<void>;
  onDeleteStatus: (id: string, label: string) => Promise<void>;
}) {
  return (
    <div className="view settings">
      <header className="hero">
        <div>
          <p className="eyebrow">Configuración</p>
          <h1>Catálogos del sistema</h1>
          <p className="hero-lead">
            Áreas técnicas y estados de equipo que se usan al crear tareas y participantes. No se
            pueden eliminar si están en uso.
          </p>
        </div>
      </header>

      <div className="detail-columns">
        <CatalogPanel
          eyebrow="Tareas"
          title="Áreas técnicas"
          hint="Cada tarea del cronograma pertenece a un área técnica (Obra civil, Estructura…)."
          icon="calendar"
          placeholder="Nombre del área (Obra civil…)"
          items={technicalAreas.map((area) => ({ id: area.id, label: area.name }))}
          onCreate={onCreateArea}
          onDelete={onDeleteArea}
        />
        <CatalogPanel
          eyebrow="Equipo"
          title="Estados de equipo"
          hint="El estado que puede tener un participante dentro de un proyecto (Activo, Inactivo…)."
          icon="users"
          placeholder="Nombre del estado (Activo…)"
          items={teamStatuses.map((status) => ({ id: status.id, label: status.type }))}
          onCreate={onCreateStatus}
          onDelete={onDeleteStatus}
        />
      </div>

      {!technicalAreas.length && !teamStatuses.length && (
        <EmptyState
          icon="folder"
          title="Sin catálogos"
          description="Añade al menos un área técnica y un estado de equipo para poder crear tareas y añadir participantes."
        />
      )}
    </div>
  );
}
