"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Avatar, EmptyState, ProgressBar } from "@/components/ui/Primitives";
import { fallbackRange, shortDate, timelineColumns } from "@/lib/format";
import { barStyle } from "@/lib/normalize";
import type { GanttMode, Task } from "@/lib/types";

function barTone(progress: number): "success" | "warning" | "accent" {
  if (progress === 100) return "success";
  if (progress < 30) return "warning";
  return "accent";
}

/**
 * Slider de progreso. Mover el control NO guarda nada: solo cambia el valor en
 * pantalla. El cambio se persiste (y aparece en el historial) al pulsar
 * «Guardar avance», que abre una confirmación. Así el historial no se llena con
 * cada micro-ajuste.
 */
function ProgressEditor({
  task,
  onCommit,
}: {
  task: Task;
  onCommit: (progress: number) => void;
}) {
  const [value, setValue] = useState(task.progress);
  const dirty = value !== task.progress;

  return (
    <div className="gantt-edit">
      <strong>Ajustar progreso</strong>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        aria-label={`Progreso de ${task.name}`}
      />
      <span>{value}% completado</span>
      {task.autoProgress && dirty && (
        <p className="gantt-edit-note">
          Este avance se calcula solo según las fechas. Si lo guardas, dejará de ser automático.
        </p>
      )}
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={!dirty}
        onClick={() => onCommit(value)}
      >
        {dirty ? "Guardar avance" : "Sin cambios"}
      </button>
    </div>
  );
}

function AutoProgressBadge({ auto }: { auto: boolean }) {
  return (
    <span
      className={auto ? "gantt-auto-badge is-auto" : "gantt-auto-badge is-manual"}
      title={auto ? "El avance se calcula solo según las fechas" : "El avance se ajustó a mano: ya no es automático"}
    >
      <i aria-hidden="true" />
      {auto ? "Automático" : "Manual"}
    </span>
  );
}

export function GanttChart({
  tasks,
  mode,
  onToggleMode,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onCommitProgress,
  readOnly = false,
  canEditProgress = true,
}: {
  tasks: Task[];
  mode: GanttMode;
  onToggleMode: () => void;
  onCreateTask: () => void;
  onEditTask: (id: string) => void;
  onDeleteTask: (task: Task) => void;
  onCommitProgress: (id: string, progress: number) => void;
  readOnly?: boolean;
  /** Solo quien creó el expediente (o el Administrador) puede ajustar el avance a mano. */
  canEditProgress?: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const editable = !readOnly;
  const progressEditable = editable && canEditProgress;

  const { rangeStart, rangeEnd, columns, todayLeft, todayLabel } = useMemo(() => {
    const times = tasks
      .flatMap((task) => [new Date(task.startISO).getTime(), new Date(task.endISO).getTime()])
      .filter((value) => Number.isFinite(value));
    const [fbStart, fbEnd] = fallbackRange();
    const start = times.length ? Math.min(...times) : fbStart;
    const end = times.length ? Math.max(...times) : fbEnd;
    const span = end - start || 1;
    // El día calendario de "hoy" se toma en hora LOCAL de quien mira la
    // pantalla (para que sea el mismo día que ve en su reloj) y luego se
    // ancla a medianoche UTC, igual que se guardan las fechas de las tareas
    // (ver shortDate). Usar directamente Date.now() sin este ajuste hace que,
    // para quien está detrás de UTC, la marca "salte" al día siguiente desde
    // media tarde en vez de a medianoche local.
    const nowLocal = new Date(now);
    const todayStart = Date.UTC(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate());
    const pct = ((todayStart - start) / span) * 100;
    return {
      rangeStart: start,
      rangeEnd: end,
      columns: timelineColumns(start, end),
      todayLeft: pct >= 0 && pct <= 100 ? pct : null,
      todayLabel: shortDate(new Date(todayStart).toISOString()),
    };
  }, [tasks, now]);

  const phases = tasks.filter((task) => task.phase).length;

  return (
    <section className="gantt">
      <header className="gantt-head">
        <div>
          <p className="eyebrow">Planificación detallada</p>
          <h2>Cronograma de ejecución</h2>
          <p className="hero-lead">
            {!editable
              ? "Vista del cronograma."
              : progressEditable
                ? "Haz clic en una tarea para ajustar su progreso."
                : "El progreso se calcula solo según las fechas. Solo quien creó el expediente puede ajustarlo a mano."}
          </p>
        </div>
        <div className="gantt-head-actions">
          <button type="button" className="btn btn-secondary" onClick={onToggleMode}>
            <Icon name="calendar" size={15} />
            Vista: {mode === "month" ? "Mes" : "Semana"}
          </button>
          {editable && (
            <button type="button" className="btn btn-primary" onClick={onCreateTask}>
              <Icon name="plus" size={15} />
              Nueva tarea
            </button>
          )}
        </div>
      </header>

      <div className="gantt-toolbar">
        <span>
          {tasks.length} elemento{tasks.length === 1 ? "" : "s"} · {phases} fase{phases === 1 ? "" : "s"}
        </span>
        <span className="gantt-legend">
          <span><i className="dot tone-success" /> Completada</span>
          <span><i className="dot tone-accent" /> En curso</span>
          <span><i className="dot tone-warning" /> Atención</span>
          {todayLeft !== null && (
            <span><i className="gantt-legend-today" /> Hoy · {todayLabel}</span>
          )}
        </span>
      </div>

      {tasks.length ? (
        <div className="gantt-scroll">
          <div className="gantt-table">
            <div className="gantt-row gantt-row-head">
              <span>Tarea / fase</span>
              <span>Responsable / área</span>
              <span>Fechas</span>
              <span>Progreso</span>
              <div className="gantt-timeline-head">
                {columns.map((label, index) => {
                  // Mismo sistema de coordenadas que la barra de progreso y la
                  // marca de "hoy" (left en %), para que el texto quede
                  // exactamente sobre la fecha que representa y no solo
                  // "más o menos" repartido por el ancho disponible.
                  const left = (index / (columns.length - 1)) * 100;
                  const shiftX = index === 0 ? "0%" : index === columns.length - 1 ? "-100%" : "-50%";
                  return (
                    <span key={index} style={{ left: `${left}%`, transform: `translate(${shiftX}, -50%)` }}>
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>

            {tasks.map((task) => {
              const open = progressEditable && openId === task.id;
              return (
                <div key={task.id} className={task.phase ? "gantt-row is-phase" : "gantt-row"}>
                  <div className="gantt-task-cell">
                    <button
                      type="button"
                      className="gantt-task"
                      onClick={() => progressEditable && setOpenId(open ? null : task.id)}
                      disabled={!progressEditable}
                    >
                      <Icon name="grip" size={15} />
                      <span className="gantt-task-code">{task.id.slice(0, 4)}</span>
                      <strong>{task.name}</strong>
                    </button>
                    {editable && (
                      <span className="gantt-row-actions">
                        <button type="button" onClick={() => onEditTask(task.id)} aria-label={`Editar ${task.name}`}>
                          <Icon name="dots" size={14} />
                        </button>
                        <button type="button" onClick={() => onDeleteTask(task)} aria-label={`Eliminar ${task.name}`}>
                          <Icon name="trash" size={14} />
                        </button>
                      </span>
                    )}
                  </div>

                  <div className="gantt-owner">
                    <Avatar name={task.owner} size="sm" />
                    <span>
                      {task.owner}
                      <small>
                        {task.technicalArea} · {task.materials} materiales · {task.driveLinks} Drive
                      </small>
                    </span>
                  </div>

                  <div className="gantt-dates">
                    {task.start} – {task.end}
                    <small>Depende de: {task.dependency || "—"}</small>
                  </div>

                  <div className="gantt-progress">
                    <strong>{task.progress}%</strong>
                    <ProgressBar value={task.progress} tone={barTone(task.progress)} />
                    <AutoProgressBadge auto={task.autoProgress} />
                  </div>

                  <div className="gantt-track">
                    {todayLeft !== null && (
                      <span
                        className="gantt-today"
                        style={{ left: `${todayLeft}%` }}
                        title={`Hoy · ${todayLabel}`}
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`gantt-bar tone-${barTone(task.progress)}`}
                      style={barStyle(task, rangeStart, rangeEnd)}
                    >
                      {task.phase && <span>FASE</span>}
                    </span>
                  </div>

                  {open && <ProgressEditor task={task} onCommit={(value) => onCommitProgress(task.id, value)} />}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          icon="calendar"
          title="Sin tareas en el cronograma"
          description={
            editable
              ? "Añade la primera tarea para empezar a planificar la ejecución."
              : "Este expediente aún no tiene tareas."
          }
          action={
            editable ? (
              <button type="button" className="btn btn-secondary" onClick={onCreateTask}>
                Nueva tarea
              </button>
            ) : undefined
          }
        />
      )}
    </section>
  );
}
