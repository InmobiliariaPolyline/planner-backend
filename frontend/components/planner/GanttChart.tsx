"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Avatar, EmptyState, ProgressBar } from "@/components/ui/Primitives";
import { fallbackRange, timelineColumns } from "@/lib/format";
import { barStyle } from "@/lib/normalize";
import type { GanttMode, Task } from "@/lib/types";

function barTone(progress: number): "success" | "warning" | "accent" {
  if (progress === 100) return "success";
  if (progress < 30) return "warning";
  return "accent";
}

export function GanttChart({
  tasks,
  mode,
  onToggleMode,
  onCreateTask,
  onUpdateProgress,
}: {
  tasks: Task[];
  mode: GanttMode;
  onToggleMode: () => void;
  onCreateTask: () => void;
  onUpdateProgress: (id: string, progress: number) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const { rangeStart, rangeEnd, columns } = useMemo(() => {
    const times = tasks
      .flatMap((task) => [new Date(task.startISO).getTime(), new Date(task.endISO).getTime()])
      .filter((value) => Number.isFinite(value));
    const [fbStart, fbEnd] = fallbackRange();
    const start = times.length ? Math.min(...times) : fbStart;
    const end = times.length ? Math.max(...times) : fbEnd;
    return { rangeStart: start, rangeEnd: end, columns: timelineColumns(start, end) };
  }, [tasks]);

  const phases = tasks.filter((task) => task.phase).length;

  return (
    <section className="gantt">
      <header className="gantt-head">
        <div>
          <p className="eyebrow">Planificación detallada</p>
          <h2>Cronograma de ejecución</h2>
          <p className="hero-lead">Haz clic en una tarea para ajustar su progreso.</p>
        </div>
        <div className="gantt-head-actions">
          <button type="button" className="btn btn-secondary" onClick={onToggleMode}>
            <Icon name="calendar" size={15} />
            Vista: {mode === "month" ? "Mes" : "Semana"}
          </button>
          <button type="button" className="btn btn-primary" onClick={onCreateTask}>
            <Icon name="plus" size={15} />
            Nueva tarea
          </button>
        </div>
      </header>

      <div className="gantt-toolbar">
        <span>
          {tasks.length} elemento{tasks.length === 1 ? "" : "s"} · {phases} fase{phases === 1 ? "" : "s"}
        </span>
        <span className="gantt-legend">
          <span>
            <i className="dot tone-success" /> Completada
          </span>
          <span>
            <i className="dot tone-accent" /> En curso
          </span>
          <span>
            <i className="dot tone-warning" /> Atención
          </span>
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
                {columns.map((label, index) => (
                  <span key={index}>{label}</span>
                ))}
              </div>
            </div>

            {tasks.map((task) => {
              const open = editingId === task.id;
              return (
                <div key={task.id} className={task.phase ? "gantt-row is-phase" : "gantt-row"}>
                  <button
                    type="button"
                    className="gantt-task"
                    onClick={() => !task.phase && setEditingId(open ? null : task.id)}
                    disabled={task.phase}
                  >
                    <Icon name="grip" size={15} />
                    <span className="gantt-task-code">{task.id.slice(0, 4)}</span>
                    <strong>{task.name}</strong>
                  </button>

                  <div className="gantt-owner">
                    <Avatar name={task.owner} size="sm" />
                    <span>
                      {task.owner}
                      <small>
                        {task.technicalArea} · {task.metrics} métricas · {task.driveLinks} Drive
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
                  </div>

                  <div className="gantt-track">
                    <span
                      className={`gantt-bar tone-${barTone(task.progress)}`}
                      style={barStyle(task, rangeStart, rangeEnd)}
                    >
                      {task.phase && <span>FASE</span>}
                    </span>
                  </div>

                  {open && (
                    <div className="gantt-edit">
                      <strong>Ajustar progreso</strong>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={task.progress}
                        onChange={(event) => onUpdateProgress(task.id, Number(event.target.value))}
                        aria-label={`Progreso de ${task.name}`}
                      />
                      <span>{task.progress}% completado</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          icon="calendar"
          title="Sin tareas en el cronograma"
          description="Añade la primera tarea para empezar a planificar la ejecución."
          action={
            <button type="button" className="btn btn-secondary" onClick={onCreateTask}>
              Nueva tarea
            </button>
          }
        />
      )}
    </section>
  );
}
