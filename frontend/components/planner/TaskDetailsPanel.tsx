"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/Primitives";
import { formatMaterialValues } from "@/lib/materials";
import { toTaskDetail } from "@/lib/normalize";
import type { RawTask } from "@/lib/types";

/** Listado desglosable de las tareas del expediente (cronograma), entre el
 * Gantt y el Historial: al hacer clic en una se ve su ficha completa —
 * responsable, y cada material elegido con su categoría, cantidad y los
 * valores propios de su métrica. Solo tareas del expediente actual que
 * siguen existiendo (viene directo de `project.tasks`, ya filtrado por eso). */
export function TaskDetailsPanel({ tasks }: { tasks: RawTask[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!tasks.length) {
    return (
      <EmptyState
        title="Sin tareas"
        description="Todavía no hay tareas creadas en el cronograma de este expediente."
      />
    );
  }

  return (
    <div className="task-details-panel">
      {tasks.map((raw) => {
        const task = toTaskDetail(raw);
        const isOpen = expanded.has(task.id);
        const materials = task.taskMaterials ?? [];
        return (
          <div key={task.id} className={isOpen ? "task-details-card is-open" : "task-details-card"}>
            <button type="button" className="task-details-summary" onClick={() => toggle(task.id)}>
              <span className="task-details-summary-main">
                <strong>{task.name}</strong>
                <span className="muted">Responsable: {task.ownerName || "Sin responsable"}</span>
              </span>
              <span className="task-details-summary-meta">
                <span>
                  {materials.length} material{materials.length === 1 ? "" : "es"}
                </span>
                <Icon name="chevron-down" size={16} />
              </span>
            </button>
            {isOpen && (
              <div className="task-details-body">
                <dl className="task-details-fields">
                  <div>
                    <dt>ID de la tarea</dt>
                    <dd>{task.id}</dd>
                  </div>
                  <div>
                    <dt>Nombre</dt>
                    <dd>{task.name}</dd>
                  </div>
                  <div>
                    <dt>Responsable</dt>
                    <dd>{task.ownerName || "Sin responsable"}</dd>
                  </div>
                </dl>

                <h4>Materiales</h4>
                {materials.length ? (
                  <ul className="task-details-materials">
                    {materials.map((tm) => (
                      <li key={tm.id}>
                        <div className="task-details-material-head">
                          <strong>{tm.material.name}</strong>
                          <span className="muted">{tm.material.category}</span>
                        </div>
                        <div className="task-details-material-values">
                          <span>Cantidad: {tm.quantity}</span>
                          {Object.keys(tm.values).length ? <span>{formatMaterialValues(tm.values)}</span> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Sin materiales.</p>
                )}
                <p className="task-details-total">Cantidad total de materiales en la tarea: {materials.length}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
