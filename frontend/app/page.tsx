"use client";

import { useState } from "react";

type Task = {
  id: string;
  name: string;
  owner: string;
  start: string;
  end: string;
  progress: number;
  phase?: boolean;
  dependency?: string;
  technicalArea: string;
  metrics: string;
  driveLinks: number;
};

const initialTasks: Task[] = [
  { id: "1", name: "Preparación del expediente", owner: "Ana Torres", start: "03 Jun", end: "07 Jun", progress: 100, phase: true, technicalArea: "Administración", metrics: "0", driveLinks: 0 },
  { id: "1.1", name: "Validación de alcance", owner: "Ana Torres", start: "03 Jun", end: "04 Jun", progress: 100, dependency: "—", technicalArea: "Planificación", metrics: "2", driveLinks: 3 },
  { id: "1.2", name: "Aprobación de presupuesto", owner: "Carlos Ruiz", start: "05 Jun", end: "07 Jun", progress: 76, dependency: "1.1", technicalArea: "Finanzas", metrics: "1", driveLinks: 2 },
  { id: "2", name: "Ejecución y seguimiento", owner: "María León", start: "10 Jun", end: "28 Jun", progress: 42, phase: true, technicalArea: "Operaciones", metrics: "0", driveLinks: 0 },
  { id: "2.1", name: "Diseño de solución técnica", owner: "María León", start: "10 Jun", end: "17 Jun", progress: 64, dependency: "1.2", technicalArea: "Ingeniería", metrics: "4", driveLinks: 5 },
  { id: "2.2", name: "Implementación inicial", owner: "Diego Soto", start: "18 Jun", end: "28 Jun", progress: 18, dependency: "2.1", technicalArea: "Construcción", metrics: "2", driveLinks: 1 },
];

const barPositions = ["11%", "15%", "22%", "39%", "42%", "58%"];

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState<"projects" | "overview" | "gantt">("projects");
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectName, setProjectName] = useState("Centro logístico Norte");
  const [tasks, setTasks] = useState(initialTasks);
  const [editingTask, setEditingTask] = useState<string | null>(null);

  function updateProgress(id: string, progress: number) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, progress } : task));
  }

  if (!authenticated) {
    return (
      <main className="login-shell">
        <section className="login-art">
          <div className="brand-mark"><span>PP</span></div>
          <p className="eyebrow">PROJECT PLANNER / CONTROL DE OBRA</p>
          <h1>Convierte cada expediente en una ejecución clara.</h1>
          <p className="login-intro">Un espacio de control para ver presupuesto, responsables y fechas críticas en un solo lugar.</p>
          <div className="login-stat"><strong>24</strong><span>proyectos activos<br />bajo seguimiento</span></div>
        </section>
        <section className="login-panel">
          <div className="login-topline"><span>Acceso administrativo</span><span className="status-dot">Sistema operativo</span></div>
          <div className="login-form-wrap">
            <p className="eyebrow dark-eyebrow">BIENVENIDO</p>
            <h2>Tu espacio de trabajo está listo.</h2>
            <p className="muted">Consulta expedientes, revisa el cronograma y mantén cada entrega bajo control.</p>
            <div className="access-box">
              <div className="access-icon">→</div>
              <div><strong>Acceso administrativo</strong><span>Panel de gestión de proyectos</span></div>
            </div>
            <button className="primary-button access-button" type="button" onClick={() => setAuthenticated(true)}>Acceder al sistema <span>→</span></button>
            <p className="secure-note">● Sesión de demostración · Última actualización del sistema hace 4 min</p>
          </div>
        </section>
      </main>
    );
  }

  const isGantt = activeView === "gantt";
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="brand-mark small"><span>PP</span></div><div><strong>PROJECT</strong><span>PLANNER</span></div></div>
        <div className="workspace-label">ESPACIO DE TRABAJO <span>⌄</span></div>
        <nav>
          <button className={activeView === "projects" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("projects")}><span>▦</span> Mis proyectos</button>
          <button className={activeView !== "projects" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("overview")}><span>◫</span> Resumen general</button>
        </nav>
        <div className="sidebar-footer"><div className="profile"><div className="avatar">AR</div><div><strong>Alex Rodríguez</strong><span>Administrador</span></div><button onClick={() => setAuthenticated(false)}>⋮</button></div></div>
      </aside>
      <section className="main-area">
        <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>{activeView === "projects" ? "Mis proyectos" : "PRJ-2026-014"}</strong></div><div className="top-actions"><button className="icon-button">⌕</button><button className="icon-button notification">♧<i /></button><div className="avatar top-avatar">AR</div></div></header>
        {activeView === "projects" ? (
          <div className="content projects-view"><div className="page-heading"><div><p className="eyebrow dark-eyebrow">GESTIÓN DE EXPEDIENTES</p><h1>Mis proyectos <span>({projectName ? "12" : "11"})</span></h1><p className="muted">Administra y da seguimiento al ciclo de vida de tus proyectos.</p></div><button className="primary-button compact" onClick={() => setShowNewProject(true)}>＋ Nuevo expediente</button></div>
            <div className="project-toolbar"><div className="search-box">⌕ <input placeholder="Buscar por nombre o ID..." /></div><button className="filter-button">Estado: Todos ⌄</button><button className="filter-button">Ordenar por ⌄</button></div>
            <div className="project-grid"><ProjectCard name="Centro logístico Norte" id="PRJ-2026-014" date="03 Jun 2026 — 28 Jun 2026" duration="0 meses" owner="Alex Rodríguez" budget="$ 248,500" progress={68} status="En ejecución" color="orange" onClick={() => setActiveView("overview")} /><ProjectCard name="Modernización Planta A" id="PRJ-2026-009" date="12 May 2026 — 30 Sep 2026" duration="4 meses" owner="Alex Rodríguez" budget="$ 512,000" progress={34} status="En ejecución" color="green" onClick={() => setActiveView("overview")} /><ProjectCard name="Auditoría de procesos Q2" id="PRJ-2026-006" date="01 Apr 2026 — 17 May 2026" duration="2 meses" owner="Alex Rodríguez" budget="$ 86,200" progress={100} status="Completado" color="blue" onClick={() => setActiveView("overview")} /></div>
            {showNewProject && <div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={() => setShowNewProject(false)}>×</button><p className="eyebrow dark-eyebrow">NUEVO EXPEDIENTE</p><h2>Crear proyecto</h2><p className="muted">Registra los datos principales para iniciar la trazabilidad.</p><label>Nombre del proyecto<input value={projectName} onChange={(event) => setProjectName(event.target.value)} /></label><div className="modal-row"><label>Fecha de inicio<input type="date" defaultValue="2026-06-03" /></label><label>Fecha de término<input type="date" defaultValue="2026-06-28" /></label></div><div className="modal-row"><label>Duración (meses)<input defaultValue="1" type="number" min="0" /></label><label>Responsable<input defaultValue="Alex Rodríguez" /></label></div><label>Presupuesto oficial<input defaultValue="248500" type="number" /></label><button className="primary-button" onClick={() => setShowNewProject(false)}>Crear expediente <span>→</span></button></div></div>}
          </div>
        ) : (
          <div className="content detail-view"><div className="detail-heading"><button className="back-button" onClick={() => setActiveView("projects")}>← Todos los proyectos</button><div className="detail-title"><div><div className="id-line"><span className="project-id">PRJ-2026-014</span><span className="status-pill orange">En ejecución</span></div><h1>Centro logístico Norte</h1><p className="muted">Última actualización hace 4 min · Responsable: Alex Rodríguez</p></div><button className="secondary-button">⋮ Acciones</button></div></div><div className="tabs"><button className={!isGantt ? "tab active" : "tab"} onClick={() => setActiveView("overview")}>Resumen del expediente</button><button className={isGantt ? "tab active" : "tab"} onClick={() => setActiveView("gantt")}>Cronograma Gantt <span>12</span></button></div>
            {!isGantt ? <><div className="summary-grid"><Metric title="Presupuesto asignado" value="$ 248,500" note="de $ 300,000 oficial" /><Metric title="Duración global" value="26 días" note="03 Jun — 28 Jun 2026" /><Metric title="Progreso general" value="68%" note="8 de 12 tareas en curso" progress={68} /></div><div className="detail-columns"><section className="panel"><div className="panel-heading"><div><p className="eyebrow dark-eyebrow">EQUIPO DEL PROYECTO</p><h2>Participantes <span className="count">4</span></h2></div><button className="small-action">＋ Añadir</button></div><Member name="Ana Torres" role="Dirección de proyecto" initials="AT" status="Active" /><Member name="Carlos Ruiz" role="Finanzas y compras" initials="CR" status="Support" /><Member name="María León" role="Área técnica" initials="ML" status="Active" /><Member name="Diego Soto" role="Implementación" initials="DS" status="Stand-by" /></section><section className="panel milestones"><div className="panel-heading"><div><p className="eyebrow dark-eyebrow">FECHAS CLAVE</p><h2>Hitos del proyecto <span className="count">3</span></h2></div><button className="small-action">＋ Añadir</button></div><Milestone date="07 JUN" title="Presupuesto aprobado" done /><Milestone date="17 JUN" title="Diseño técnico validado" /><Milestone date="28 JUN" title="Entrega de expediente" /></section></div></> : <Gantt tasks={tasks} editingTask={editingTask} setEditingTask={setEditingTask} updateProgress={updateProgress} />}
          </div>
        )}
      </section>
    </main>
  );
}

function ProjectCard({ name, id, date, duration, owner, budget, progress, status, color, onClick }: { name: string; id: string; date: string; duration: string; owner: string; budget: string; progress: number; status: string; color: string; onClick: () => void }) {
  return <button className="project-card" onClick={onClick}><div className={`card-accent ${color}`} /><div className="card-top"><span className={`status-pill ${color}`}>{status}</span><span className="more">⋮</span></div><h2>{name}</h2><span className="project-id">{id}</span><div className="card-meta"><span>◷ {date}</span><span>▣ {budget}</span></div><div className="card-meta secondary-meta"><span>Duración: {duration}</span><span>Responsable: {owner}</span></div><div className="card-progress"><div><span>Progreso</span><strong>{progress}%</strong></div><div className="progress-track"><i style={{ width: `${progress}%` }} /></div></div><span className="open-link">Abrir expediente →</span></button>;
}

function Metric({ title, value, note, progress }: { title: string; value: string; note: string; progress?: number }) { return <div className="metric"><span className="metric-title">{title}</span><strong>{value}</strong>{progress !== undefined && <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>}<span className="metric-note">{note}</span></div>; }
function Member({ name, role, initials, status }: { name: string; role: string; initials: string; status: string }) { return <div className="member"><div className="avatar">{initials}</div><div><strong>{name}</strong><span>{role}</span></div><span className={`member-status ${status.toLowerCase()}`}>{status}</span></div>; }
function Milestone({ date, title, done }: { date: string; title: string; done?: boolean }) { return <div className="milestone"><div className={done ? "milestone-dot done" : "milestone-dot"}>{done ? "✓" : ""}</div><div><span>{date}</span><strong>{title}</strong></div><button>⋮</button></div>; }

function Gantt({ tasks, editingTask, setEditingTask, updateProgress }: { tasks: Task[]; editingTask: string | null; setEditingTask: (id: string | null) => void; updateProgress: (id: string, progress: number) => void }) {
  return <section className="gantt-panel"><div className="gantt-header"><div><p className="eyebrow dark-eyebrow">PLANIFICACIÓN DETALLADA</p><h2>Cronograma de ejecución</h2><p className="muted">Haz clic en cualquier tarea para modificar su progreso o responsable.</p></div><div><button className="secondary-button">⊞ Vista: Mes</button><button className="small-action">＋ Nueva tarea</button></div></div><div className="gantt-tools"><span>12 elementos · 2 fases</span><span className="legend"><i className="legend-dot complete" /> Completada <i className="legend-dot current" /> En curso <i className="legend-dot delayed" /> Atención</span></div><div className="gantt-table"><div className="task-head"><span>TAREA / FASE</span><span>RESPONSABLE / ÁREA</span><span>FECHAS / DEP.</span><span>PROGRESO</span><div className="timeline-head"><span>03 JUN</span><span>10 JUN</span><span>17 JUN</span><span>24 JUN</span></div></div>{tasks.map((task, index) => <div className={task.phase ? "task-row phase-row" : "task-row"} key={task.id} onClick={() => !task.phase && setEditingTask(editingTask === task.id ? null : task.id)}><div className="task-name"><span className="drag">⠿</span><span className="task-number">{task.id}</span><strong>{task.name}</strong></div><span className="owner"><span className="avatar mini">{task.owner.split(" ").map((part) => part[0]).join("")}</span><span>{task.owner}<small>{task.technicalArea} · {task.metrics} métricas · {task.driveLinks} Drive</small></span></span><span className="dates">{task.start}<br />{task.end}<small>Depende de: {task.dependency ?? "—"}</small></span><div className="task-progress"><strong>{task.progress}%</strong><div className="progress-track"><i style={{ width: `${task.progress}%` }} /></div></div><div className="timeline"><div className={`gantt-bar ${task.progress === 100 ? "complete" : task.progress < 30 ? "delayed" : "current"}`} style={{ left: barPositions[index], width: task.phase ? "39%" : "18%" }}>{task.phase && <span>FASE</span>}</div></div>{editingTask === task.id && <div className="edit-popover"><strong>Modificando tarea</strong><label>Progreso <input type="range" min="0" max="100" value={task.progress} onChange={(event) => updateProgress(task.id, Number(event.target.value))} /></label><span>{task.progress}% completado</span></div>}</div>)}</div></section>;
}
