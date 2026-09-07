"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { Avatar, Badge, EmptyState, StatCard } from "@/components/ui/Primitives";
import { currency, dateRange, isoDay } from "@/lib/format";
import type { Project } from "@/lib/types";

export function ProjectDetailView({
  project,
  taskCount,
  activeTab,
  banner,
  onTab,
  onBack,
  onEdit,
  onDelete,
  onShare,
  onAddMember,
  onAddMilestone,
  gantt,
}: {
  project: Project;
  taskCount: number;
  activeTab: "overview" | "gantt";
  banner: string;
  onTab: (tab: "overview" | "gantt") => void;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onAddMember: () => void;
  onAddMilestone: () => void;
  gantt: ReactNode;
}) {
  const completed = project.progress === 100;
  const members = project.teamMembers ?? [];
  const milestones = project.milestones ?? [];

  return (
    <div className="view detail">
      <button type="button" className="link-btn back" onClick={onBack}>
        <Icon name="arrow-left" size={14} />
        Todos los proyectos
      </button>

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
        <div className="detail-actions">
          <button type="button" className="btn btn-secondary" onClick={onShare}>
            <Icon name="link" size={15} />
            Compartir
          </button>
          <button type="button" className="btn btn-secondary" onClick={onEdit}>
            Editar expediente
          </button>
          <button type="button" className="btn btn-ghost-danger" onClick={onDelete}>
            <Icon name="trash" size={15} />
            Eliminar
          </button>
        </div>
      </header>

      {banner && <p className="banner">{banner}</p>}

      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "overview"}
          className={activeTab === "overview" ? "tab is-active" : "tab"}
          onClick={() => onTab("overview")}
        >
          Resumen del expediente
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "gantt"}
          className={activeTab === "gantt" ? "tab is-active" : "tab"}
          onClick={() => onTab("gantt")}
        >
          Cronograma Gantt <span className="count">{taskCount}</span>
        </button>
      </div>

      {activeTab === "overview" ? (
        <>
          <div className="stat-grid">
            <StatCard
              label="Presupuesto asignado"
              value={currency(project.budget)}
              hint="Presupuesto oficial"
              icon="wallet"
            />
            <StatCard
              label="Duración global"
              value={`${project.durationMonths} meses`}
              hint={dateRange(project.startDate, project.endDate)}
              icon="clock"
            />
            <StatCard
              label="Progreso general"
              value={`${project.progress}%`}
              hint={`${taskCount} tareas registradas`}
              icon="gauge"
              progress={project.progress}
            />
          </div>

          <div className="detail-columns">
            <section className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Equipo del proyecto</p>
                  <h2>
                    Participantes <span className="count">{members.length}</span>
                  </h2>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={onAddMember}>
                  <Icon name="plus" size={14} />
                  Añadir
                </button>
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
                  <h2>
                    Hitos del proyecto <span className="count">{milestones.length}</span>
                  </h2>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={onAddMilestone}>
                  <Icon name="plus" size={14} />
                  Añadir
                </button>
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
        gantt
      )}
    </div>
  );
}
