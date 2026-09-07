"use client";

import { useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, ProgressBar, StatCard } from "@/components/ui/Primitives";
import { currency, greeting, periodLabel } from "@/lib/format";
import type { Project } from "@/lib/types";

export function DashboardView({
  projects,
  onCreate,
  onOpenProjects,
  onSelect,
}: {
  projects: Project[];
  onCreate: () => void;
  onOpenProjects: () => void;
  onSelect: (project: Project) => void;
}) {
  const summary = useMemo(() => {
    const active = projects.filter((project) => project.progress < 100).length;
    const completed = projects.filter((project) => project.progress === 100).length;
    const totalBudget = projects.reduce((total, project) => total + project.budget, 0);
    const averageProgress = projects.length
      ? Math.round(projects.reduce((total, project) => total + project.progress, 0) / projects.length)
      : 0;
    return { active, completed, totalBudget, averageProgress };
  }, [projects]);

  const hello = useMemo(() => greeting(), []);
  const period = useMemo(() => periodLabel(), []);

  return (
    <div className="view dashboard">
      <header className="hero">
        <div>
          <p className="eyebrow">Centro de control · {period}</p>
          <h1>{hello}</h1>
          <p className="hero-lead">
            Una lectura rápida de tus expedientes y de lo que requiere atención.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onCreate}>
          <Icon name="plus" size={16} />
          Crear expediente
        </button>
      </header>

      <div className="stat-grid">
        <StatCard
          label="Expedientes activos"
          value={String(summary.active).padStart(2, "0")}
          hint={`${projects.length} registrados en total`}
          icon="folder"
        />
        <StatCard
          label="Presupuesto en cartera"
          value={currency(summary.totalBudget)}
          hint="Suma de expedientes registrados"
          icon="wallet"
        />
        <StatCard
          label="Avance promedio"
          value={`${summary.averageProgress}%`}
          hint={`${summary.completed} expedientes completados`}
          icon="gauge"
          progress={summary.averageProgress}
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Seguimiento</p>
              <h2>Actividad reciente</h2>
            </div>
            <button type="button" className="link-btn" onClick={onOpenProjects}>
              Ver todos
              <Icon name="arrow-right" size={14} />
            </button>
          </div>

          {projects.length ? (
            <ul className="activity-list">
              {projects.slice(0, 5).map((project) => (
                <li key={project.id}>
                  <button type="button" onClick={() => onSelect(project)}>
                    <span className="activity-name">
                      <strong>{project.name}</strong>
                      <span>{project.ownerName}</span>
                    </span>
                    <span className="activity-progress">
                      <ProgressBar value={project.progress} />
                    </span>
                    <b>{project.progress}%</b>
                    <Icon name="arrow-right" size={15} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon="folder"
              title="Tu espacio empieza aquí"
              description="Crea tu primer expediente para ver avances, presupuesto y fechas clave."
              action={
                <button type="button" className="btn btn-secondary" onClick={onCreate}>
                  Crear primer expediente
                </button>
              }
            />
          )}
        </section>

        <section className="panel portfolio">
          <p className="eyebrow">Lectura del portafolio</p>
          <h2>Estado general</h2>
          <div
            className="ring"
            style={{ "--value": `${summary.averageProgress * 3.6}deg` } as React.CSSProperties}
          >
            <div className="ring-center">
              <strong>{summary.averageProgress}%</strong>
              <span>avance medio</span>
            </div>
          </div>
          <ul className="portfolio-legend">
            <li>
              <span className="dot tone-accent" /> En ejecución <b>{summary.active}</b>
            </li>
            <li>
              <span className="dot tone-success" /> Completados <b>{summary.completed}</b>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
