"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Badge, EmptyState, ProgressBar } from "@/components/ui/Primitives";
import { currency, dateRange } from "@/lib/format";
import type { Project, SortOrder, StatusFilter } from "@/lib/types";

function ProjectCard({
  project,
  onOpen,
  onDelete,
}: {
  project: Project;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const completed = project.progress === 100;
  return (
    <article className="project-card">
      <button type="button" className="project-card-body" onClick={onOpen}>
        <div className="project-card-top">
          <Badge tone={completed ? "success" : "accent"}>
            {completed ? "Completado" : "En ejecución"}
          </Badge>
          <span className="project-code">{project.id.slice(0, 8)}</span>
        </div>
        <h3>{project.name}</h3>
        <dl className="project-meta">
          <div>
            <dt>
              <Icon name="calendar" size={14} />
            </dt>
            <dd>{dateRange(project.startDate, project.endDate)}</dd>
          </div>
          <div>
            <dt>
              <Icon name="wallet" size={14} />
            </dt>
            <dd>{currency(project.budget)}</dd>
          </div>
          <div>
            <dt>
              <Icon name="clock" size={14} />
            </dt>
            <dd>{project.durationMonths} meses</dd>
          </div>
          <div>
            <dt>
              <Icon name="users" size={14} />
            </dt>
            <dd>{project.ownerName}</dd>
          </div>
        </dl>
        <div className="project-card-progress">
          <div>
            <span>Progreso</span>
            <strong>{project.progress}%</strong>
          </div>
          <ProgressBar value={project.progress} tone={completed ? "success" : "accent"} />
        </div>
        <span className="project-card-open">
          Abrir expediente
          <Icon name="arrow-right" size={14} />
        </span>
      </button>
      <button
        type="button"
        className="project-card-delete"
        onClick={onDelete}
        aria-label={`Eliminar expediente ${project.name}`}
      >
        <Icon name="trash" size={15} />
      </button>
    </article>
  );
}

export function ProjectsView({
  projects,
  apiMessage,
  onCreate,
  onSelect,
  onDelete,
}: {
  projects: Project[];
  apiMessage: string;
  onCreate: () => void;
  onSelect: (project: Project) => void;
  onDelete: (project: Project) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("recent");

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projects
      .filter(
        (project) =>
          project.name.toLowerCase().includes(term) || project.id.toLowerCase().includes(term),
      )
      .filter((project) =>
        statusFilter === "all"
          ? true
          : statusFilter === "completed"
            ? project.progress === 100
            : project.progress < 100,
      )
      .sort((a, b) =>
        sortOrder === "name"
          ? a.name.localeCompare(b.name)
          : sortOrder === "progress"
            ? b.progress - a.progress
            : 0,
      );
  }, [projects, search, statusFilter, sortOrder]);

  return (
    <div className="view projects">
      <header className="hero">
        <div>
          <p className="eyebrow">Gestión de expedientes</p>
          <h1>
            Mis proyectos <span className="count">{visible.length}</span>
          </h1>
          <p className="hero-lead">Administra y da seguimiento al ciclo de vida de tus proyectos.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onCreate}>
          <Icon name="plus" size={16} />
          Nuevo expediente
        </button>
      </header>

      {apiMessage && <p className="banner">{apiMessage}</p>}

      <div className="toolbar">
        <div className="search-field">
          <Icon name="search" size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nombre o ID…"
            aria-label="Buscar proyectos por nombre o ID"
          />
        </div>
        <label className="select-field">
          <span>Estado</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="all">Todos</option>
            <option value="active">En ejecución</option>
            <option value="completed">Completados</option>
          </select>
        </label>
        <label className="select-field">
          <span>Ordenar por</span>
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as SortOrder)}
          >
            <option value="recent">Más recientes</option>
            <option value="name">Nombre</option>
            <option value="progress">Progreso</option>
          </select>
        </label>
      </div>

      {visible.length ? (
        <div className="project-grid">
          {visible.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => onSelect(project)}
              onDelete={() => onDelete(project)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="search"
          title={projects.length ? "Sin resultados" : "Aún no hay expedientes"}
          description={
            projects.length
              ? "Ajusta la búsqueda o los filtros para ver más proyectos."
              : "Crea tu primer expediente para comenzar el seguimiento."
          }
          action={
            !projects.length ? (
              <button type="button" className="btn btn-secondary" onClick={onCreate}>
                Nuevo expediente
              </button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
