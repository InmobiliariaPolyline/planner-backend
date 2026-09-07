"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/Primitives";
import { api } from "@/lib/api";
import { dateTime, relativeTime } from "@/lib/format";
import type { ActivityEvent } from "@/lib/types";

const ICON_BY_ENTITY: Record<string, IconName> = {
  expediente: "folder",
  tarea: "calendar",
  participante: "users",
  hito: "flag",
  métrica: "target",
  enlace: "link",
  "enlace público": "link",
};

const MONEY_FIELDS = new Set(["budget", "Presupuesto"]);

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function dayLabel(iso: string): string {
  const today = new Date();
  const d = new Date(iso);
  const diff = Math.round(
    (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) /
      86_400_000,
  );
  if (diff <= 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
}

export function ActivityTimeline({
  projectId,
  reloadKey = 0,
}: {
  projectId: string;
  /** Cambia este número para forzar una recarga del historial. */
  reloadKey?: number;
}) {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(
    (showSpinner = false) => {
      setError("");
      if (showSpinner) setEvents(null);
      api
        .listActivity(projectId)
        .then((data) => setEvents(Array.isArray(data) ? data : []))
        .catch((loadError) => {
          setEvents([]);
          setError(loadError instanceof Error ? loadError.message : "No fue posible cargar el historial");
        });
    },
    [projectId],
  );

  useEffect(() => {
    // Carga inicial y recarga cuando cambia el expediente o `reloadKey`.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(true);
  }, [load, reloadKey]);

  if (events === null) {
    return (
      <section className="panel activity">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Trazabilidad</p>
            <h2>Historial del expediente</h2>
          </div>
        </div>
        <div className="activity-loading">
          <span className="skeleton" style={{ height: 44 }} />
          <span className="skeleton" style={{ height: 44 }} />
          <span className="skeleton" style={{ height: 44 }} />
        </div>
      </section>
    );
  }

  const groups: { key: string; label: string; items: ActivityEvent[] }[] = [];
  for (const event of events) {
    const key = dayKey(event.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(event);
    else groups.push({ key, label: dayLabel(event.createdAt), items: [event] });
  }

  return (
    <section className="panel activity">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Trazabilidad</p>
          <h2>
            Historial del expediente <span className="count">{events.length}</span>
          </h2>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => load()}>
          <Icon name="arrow-right" size={14} />
          Actualizar
        </button>
      </div>

      {error && (
        <p className="activity-note">
          {error}. El historial aparece en cuanto la base de datos tiene la tabla de sucesos.
        </p>
      )}

      {!events.length && !error ? (
        <EmptyState
          icon="clock"
          title="Sin sucesos todavía"
          description="Aquí se irá registrando cada cambio del expediente: creación, ediciones de valores, altas y bajas."
        />
      ) : (
        <div className="activity-feed">
          {groups.map((group) => (
            <div key={group.key} className="activity-day">
              <p className="activity-day-label">{group.label}</p>
              <ol className="activity-events">
                {group.items.map((event) => (
                  <li key={event.id} className={`activity-event tone-${event.tone}`}>
                    <span className="activity-dot" aria-hidden="true">
                      <Icon name={ICON_BY_ENTITY[event.entity] ?? "dots"} size={13} />
                    </span>
                    <div className="activity-body">
                      <p className="activity-summary">{event.summary}</p>
                      <p className="activity-meta">
                        <strong>{event.actor}</strong>
                        <span title={dateTime(event.createdAt)}>
                          {relativeTime(Date.parse(event.createdAt))}
                        </span>
                      </p>
                      {event.changes && event.changes.length > 0 && (
                        <ul className="activity-changes">
                          {event.changes.map((change, index) => (
                            <li
                              key={index}
                              className={MONEY_FIELDS.has(change.field) || MONEY_FIELDS.has(change.label) ? "is-money" : undefined}
                            >
                              <span className="activity-change-label">{change.label}</span>
                              <span className="activity-change-from">{change.from}</span>
                              <Icon name="arrow-right" size={12} />
                              <span className="activity-change-to">{change.to}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
