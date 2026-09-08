"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Avatar, Badge, EmptyState, StatCard } from "@/components/ui/Primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { api, fetchShared } from "@/lib/api";
import { currency, dateRange, isoDay } from "@/lib/format";
import { normalizeTasks, toTaskDetail } from "@/lib/normalize";
import type {
  GanttMode,
  Project,
  ProjectFormValues,
  RawTask,
  SharedPayload,
  Task,
  TaskDetail,
  TaskFormValues,
  TechnicalArea,
} from "@/lib/types";
import { GanttChart } from "./GanttChart";
import { budgetToNumber, ProjectFormModal, projectToForm } from "./ProjectFormModal";
import { TaskFormModal } from "./TaskFormModal";

type Modal = null | { kind: "project" } | { kind: "taskCreate" } | { kind: "taskEdit"; task: TaskDetail } | { kind: "taskDelete"; task: Task };

export function SharedExpediente({ token, payload }: { token: string; payload: SharedPayload }) {
  const canEdit = payload.role === "editor";

  const [project, setProject] = useState<Project>(payload.project);
  const [tab, setTab] = useState<"overview" | "gantt">("overview");
  const [ganttMode, setGanttMode] = useState<GanttMode>("month");
  const [modal, setModal] = useState<Modal>(null);
  const [notice, setNotice] = useState("");
  const [areas, setAreas] = useState<TechnicalArea[]>([]);

  const tasks = useMemo<Task[]>(() => normalizeTasks((project.tasks ?? []) as RawTask[]), [project]);
  const completed = project.progress === 100;
  const members = project.teamMembers ?? [];
  const milestones = project.milestones ?? [];

  useEffect(() => {
    if (canEdit) api.listTechnicalAreas().then(setAreas).catch(() => undefined);
  }, [canEdit]);

  const reload = useCallback(async () => {
    const result = await fetchShared(token);
    if (result.status === "ok") setProject(result.data.project);
  }, [token]);

  async function saveProject(values: ProjectFormValues) {
    const updated = await api.patchSharedProject(token, {
      name: values.name.trim(),
      startDate: values.startDate,
      endDate: values.endDate,
      budget: budgetToNumber(values.budget),
      ownerName: values.ownerName.trim(),
    });
    setProject(updated);
    setModal(null);
    setNotice("Cambios guardados.");
  }

  async function saveTask(values: TaskFormValues, existing?: TaskDetail) {
    const payloadData = {
      name: values.name.trim(),
      ownerName: values.ownerName.trim(),
      startDate: values.startDate,
      endDate: values.endDate,
      technicalAreaId: values.technicalAreaId,
      isPhase: values.isPhase,
      dependency: values.dependency.trim(),
    };
    if (existing) await api.patchSharedTask(token, existing.id, payloadData);
    else await api.createSharedTask(token, { ...payloadData, progress: 0 });
    await reload();
    setModal(null);
    setNotice(existing ? "Tarea actualizada." : "Tarea creada.");
  }

  async function commitProgress(id: string, progress: number) {
    const previous = tasks.find((task) => task.id === id)?.progress ?? 0;
    // optimista sobre una copia local del proyecto
    setProject((current) => ({
      ...current,
      tasks: (current.tasks ?? []).map((raw) =>
        String((raw as RawTask).id) === id ? { ...(raw as RawTask), progress } : raw,
      ),
    }));
    try {
      await api.patchSharedTaskProgress(token, id, progress);
      await reload();
    } catch (error) {
      setProject((current) => ({
        ...current,
        tasks: (current.tasks ?? []).map((raw) =>
          String((raw as RawTask).id) === id ? { ...(raw as RawTask), progress: previous } : raw,
        ),
      }));
      setNotice(error instanceof Error ? error.message : "No fue posible guardar el progreso");
    }
  }

  async function createArea(name: string) {
    const area = await api.createTechnicalArea(name);
    setAreas((current) => [...current, area]);
    return area;
  }

  function openTaskEdit(taskId: string) {
    const raw = (project.tasks ?? []).find((t) => String((t as RawTask).id) === taskId);
    if (raw) setModal({ kind: "taskEdit", task: toTaskDetail(raw as RawTask) });
  }

  return (
    <div className="public">
      <header className="public-bar">
        <div className="public-brand">
          <span className="brand-mark brand-mark-md" aria-hidden="true">
            <Icon name="target" size={18} />
          </span>
          <div>
            <strong>Project Planner</strong>
            <span>Expediente compartido</span>
          </div>
        </div>
        <Badge tone={canEdit ? "accent" : "neutral"}>
          <Icon name={canEdit ? "link" : "folder"} size={12} />
          {canEdit ? "Enlace de edición" : "Solo lectura"}
        </Badge>
      </header>

      <main className="content">
        <div className="view detail">
          <header className="detail-head">
            <div>
              <div className="detail-id">
                <span className="project-code">{project.id.slice(0, 8)}</span>
                <Badge tone={completed ? "success" : "accent"}>
                  {completed ? "Completado" : "En ejecución"}
                </Badge>
              </div>
              <h1>{project.name}</h1>
              <p className="hero-lead">Responsable: {project.ownerName}</p>
            </div>
            {canEdit && (
              <div className="detail-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setModal({ kind: "project" })}>
                  Editar expediente
                </button>
              </div>
            )}
          </header>

          {notice && <p className="banner">{notice}</p>}

          <div className="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "overview"}
              className={tab === "overview" ? "tab is-active" : "tab"}
              onClick={() => setTab("overview")}
            >
              Resumen del expediente
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "gantt"}
              className={tab === "gantt" ? "tab is-active" : "tab"}
              onClick={() => setTab("gantt")}
            >
              Cronograma Gantt <span className="count">{tasks.length}</span>
            </button>
          </div>

          {tab === "overview" ? (
            <>
              <div className="stat-grid">
                <StatCard label="Presupuesto asignado" value={currency(project.budget)} hint="Presupuesto oficial" icon="wallet" />
                <StatCard
                  label="Duración global"
                  value={`${project.durationMonths} meses`}
                  hint={dateRange(project.startDate, project.endDate)}
                  icon="clock"
                />
                <StatCard
                  label="Progreso general"
                  value={`${project.progress}%`}
                  hint={`${tasks.length} tareas registradas`}
                  icon="gauge"
                  progress={project.progress}
                />
              </div>

              <div className="detail-columns">
                <section className="panel">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Equipo del proyecto</p>
                      <h2>Participantes <span className="count">{members.length}</span></h2>
                    </div>
                  </div>
                  {members.length ? (
                    <ul className="people-list">
                      {members.map((member) => (
                        <li key={member.id}>
                          <Avatar name={member.name} size="md" />
                          <div>
                            <strong>{member.name}</strong>
                            <span>Participante del proyecto</span>
                          </div>
                          <Badge tone="success">{member.teamStatus.type}</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState icon="users" title="Sin participantes" description="Aún no hay equipo registrado." />
                  )}
                </section>

                <section className="panel">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Fechas clave</p>
                      <h2>Hitos del proyecto <span className="count">{milestones.length}</span></h2>
                    </div>
                  </div>
                  {milestones.length ? (
                    <ul className="milestone-list">
                      {milestones.map((milestone) => (
                        <li key={milestone.id}>
                          <span className="milestone-dot" aria-hidden="true">
                            <Icon name="flag" size={13} />
                          </span>
                          <div>
                            <span>{isoDay(milestone.date)}</span>
                            <strong>{milestone.description}</strong>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState icon="flag" title="Sin hitos" description="Aún no hay fechas clave registradas." />
                  )}
                </section>
              </div>
            </>
          ) : (
            <GanttChart
              tasks={tasks}
              mode={ganttMode}
              onToggleMode={() => setGanttMode((m) => (m === "month" ? "week" : "month"))}
              onCreateTask={() => setModal({ kind: "taskCreate" })}
              onEditTask={openTaskEdit}
              onDeleteTask={(task) => setModal({ kind: "taskDelete", task })}
              onCommitProgress={commitProgress}
              readOnly={!canEdit}
            />
          )}
        </div>
      </main>

      {modal?.kind === "project" && (
        <ProjectFormModal
          mode="edit"
          initialValues={projectToForm(project)}
          onClose={() => setModal(null)}
          onSubmit={saveProject}
        />
      )}
      {modal?.kind === "taskCreate" && (
        <TaskFormModal
          mode="create"
          technicalAreas={areas}
          onCreateArea={createArea}
          onSubmit={(values) => saveTask(values)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === "taskEdit" && (
        <TaskFormModal
          mode="edit"
          initialTask={modal.task}
          technicalAreas={areas}
          onCreateArea={createArea}
          onSubmit={(values) => saveTask(values, modal.task)}
          onExtrasChanged={() => void reload()}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === "taskDelete" && (
        <ConfirmDialog
          title="Eliminar tarea"
          message={`Eliminar la tarea "${modal.task.name}" del cronograma.`}
          confirmLabel="Eliminar"
          onConfirm={async () => {
            await api.deleteSharedTask(token, modal.task.id);
            await reload();
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
