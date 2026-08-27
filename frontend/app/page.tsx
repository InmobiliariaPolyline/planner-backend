"use client";

import { useEffect, useState } from "react";

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

type Project = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  budget: number;
  durationMonths: number;
  progress: number;
  ownerName: string;
  tasks?: Task[];
  milestones?: { id: string; description: string; date: string }[];
  teamMembers?: { id: string; name: string; teamStatus: { type: string } }[];
};

type StatusFilter = "all" | "active" | "completed";
type SortOrder = "recent" | "name" | "progress";
type Notification = { id: number; message: string; time: string };

const initialTasks: Task[] = [];
const demoProjects: Project[] = [];
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const themeKey = "project-planner-theme";
let createTaskHandler: (() => void) | undefined;

const timelineStart = new Date("2026-06-03T00:00:00");
const timelineEnd = new Date("2026-06-28T00:00:00");
const monthNumbers: Record<string, number> = { Ene: 0, Feb: 1, Mar: 2, Abr: 3, May: 4, Jun: 5, Jul: 6, Ago: 7, Sep: 8, Oct: 9, Nov: 10, Dic: 11 };

function getBarStyle(task: Task) {
  const [startDay, startMonth] = task.start.split(" ");
  const [endDay, endMonth] = task.end.split(" ");
  const start = new Date(2026, monthNumbers[startMonth], Number(startDay));
  const end = new Date(2026, monthNumbers[endMonth], Number(endDay));
  const total = timelineEnd.getTime() - timelineStart.getTime();
  const left = Math.max(0, Math.min(100, ((start.getTime() - timelineStart.getTime()) / total) * 100));
  const width = Math.max(5, Math.min(100 - left, ((end.getTime() - start.getTime()) / total) * 100 + 5));
  return { left: `${left}%`, width: `${width}%` };
}

function normalizeTasks(tasks: Array<Record<string, unknown>> = []): Task[] {
  return tasks.map((task, index) => ({
    id: String(task.id ?? index + 1),
    name: String(task.name ?? "Tarea sin nombre"),
    owner: String(task.ownerName ?? "Sin responsable"),
    start: new Date(String(task.startDate)).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }).replace(".", ""),
    end: new Date(String(task.endDate)).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }).replace(".", ""),
    progress: Number(task.progress ?? 0),
    phase: Boolean(task.isPhase),
    dependency: String(task.dependency ?? ""),
    technicalArea: typeof task.technicalArea === "object" && task.technicalArea !== null ? String((task.technicalArea as { name?: string }).name ?? "Sin área") : "Sin área",
    metrics: String(Array.isArray(task.performanceMetrics) ? task.performanceMetrics.length : 0),
    driveLinks: Array.isArray(task.driveLinks) ? task.driveLinks.length : 0,
  }));
}

export default function Home() {
  const [isBooting, setIsBooting] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const storedTheme = window.localStorage.getItem(themeKey);
    return storedTheme === "dark" ? "dark" : "light";
  });
  const [activeView, setActiveView] = useState<"dashboard" | "projects" | "overview" | "gantt">("dashboard");
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectStartDate, setProjectStartDate] = useState("");
  const [projectEndDate, setProjectEndDate] = useState("");
  const [projectDuration, setProjectDuration] = useState("");
  const [projectOwner, setProjectOwner] = useState("");
  const [projectBudget, setProjectBudget] = useState("");
  const [tasks, setTasks] = useState(initialTasks);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>(demoProjects);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [apiMessage, setApiMessage] = useState("");
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("recent");
  const [ganttMode, setGanttMode] = useState<"month" | "week">("month");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showEditProject, setShowEditProject] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsBooting(false), 850);
    return () => window.clearTimeout(timer);
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const nextTheme = current === "light" ? "dark" : "light";
      window.localStorage.setItem(themeKey, nextTheme);
      return nextTheme;
    });
  }

  function addNotification(message: string) {
    setNotifications((current) => [{ id: Date.now(), message, time: "Ahora" }, ...current].slice(0, 8));
  }

  useEffect(() => {
    if (!authenticated) return;
    fetch(`${apiUrl}/projects`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("API no disponible")))
      .then((data: Project[]) => {
        setProjects(data);
        setApiMessage("");
        if (data.length) addNotification(`${data.length} expediente${data.length === 1 ? "" : "s"} cargado${data.length === 1 ? "" : "s"} desde Neon.`);
      })
      .catch(() => {
        setProjects([]);
        setApiMessage("API no disponible. No se cargaron proyectos locales.");
        addNotification("No fue posible conectar con la API de Render.");
      });
  }, [authenticated]);

  function selectProject(project: Project) {
    setSelectedProject(project);
    setTasks(normalizeTasks((project.tasks ?? []) as unknown as Array<Record<string, unknown>>));
    setActiveView("overview");
  }

  async function createProject() {
    if (!projectName.trim() || !projectStartDate || !projectEndDate || !projectDuration || !projectOwner.trim() || !projectBudget) throw new Error("Completa todos los campos del expediente");
    const projectData = { name: projectName.trim(), startDate: projectStartDate, endDate: projectEndDate, budget: Number(projectBudget), durationMonths: Number(projectDuration), ownerName: projectOwner.trim() };
    let project: Project;
    try {
      const response = await fetch(`${apiUrl}/projects`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(projectData) });
      if (!response.ok) throw new Error("No fue posible crear el expediente");
      project = await response.json() as Project;
    } catch (error) {
      throw error instanceof Error ? error : new Error("No fue posible conectar con la API");
    }
    setProjects((current) => [project, ...current]);
    setSelectedProject(project);
    setShowNewProject(false);
    setApiMessage("Expediente creado correctamente.");
    addNotification(`Expediente creado: ${project.name}.`);
    setProjectName("");
    setProjectStartDate("");
    setProjectEndDate("");
    setProjectDuration("");
    setProjectOwner("");
    setProjectBudget("");
  }

  async function deleteProject(project: Project) {
    if (!window.confirm(`¿Eliminar el expediente "${project.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      const response = await fetch(`${apiUrl}/projects/${project.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("No fue posible eliminar el expediente");
      const remainingProjects = projects.filter((item) => item.id !== project.id);
      setProjects(remainingProjects);
      if (selectedProject?.id === project.id) {
        setSelectedProject(null);
        setActiveView("projects");
      }
      setApiMessage("Expediente eliminado correctamente.");
      addNotification(`Expediente eliminado: ${project.name}.`);
    } catch (error) {
      setApiMessage(error instanceof Error ? error.message : "No fue posible eliminar el expediente");
    }
  }

  async function addMember() {
    if (!selectedProject) return;
    const name = window.prompt("Nombre del participante");
    if (!name?.trim()) return;
    try {
      const statusesResponse = await fetch(`${apiUrl}/team-statuses`);
      const statuses = await statusesResponse.json() as { id: string; type: string }[];
      if (!statuses.length) throw new Error("Configura al menos un estado de equipo antes de añadir participantes.");
      const response = await fetch(`${apiUrl}/projects/${selectedProject.id}/team-members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), teamStatusId: statuses[0].id }) });
      if (!response.ok) throw new Error("No fue posible añadir al participante");
      const member = await response.json();
      const updatedProject = { ...selectedProject, teamMembers: [...(selectedProject.teamMembers ?? []), member] };
      setSelectedProject(updatedProject);
      setProjects((current) => current.map((project) => project.id === updatedProject.id ? updatedProject : project));
      setApiMessage("Participante añadido correctamente.");
      addNotification(`Participante añadido a ${selectedProject.name}.`);
    } catch (error) {
      setApiMessage(error instanceof Error ? error.message : "No fue posible añadir al participante");
    }
  }

  async function addMilestone() {
    if (!selectedProject) return;
    const description = window.prompt("Descripción del hito");
    const date = window.prompt("Fecha del hito (AAAA-MM-DD)");
    if (!description?.trim() || !date) return;
    try {
      const response = await fetch(`${apiUrl}/projects/${selectedProject.id}/milestones`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: description.trim(), date }) });
      if (!response.ok) throw new Error("No fue posible añadir el hito");
      const milestone = await response.json();
      const updatedProject = { ...selectedProject, milestones: [...(selectedProject.milestones ?? []), milestone] };
      setSelectedProject(updatedProject);
      setProjects((current) => current.map((project) => project.id === updatedProject.id ? updatedProject : project));
      setApiMessage("Hito añadido correctamente.");
      addNotification(`Hito añadido a ${selectedProject.name}.`);
    } catch (error) {
      setApiMessage(error instanceof Error ? error.message : "No fue posible añadir el hito");
    }
  }

  async function createTask() {
    if (!selectedProject) return;
    const name = window.prompt("Nombre de la tarea");
    const startDate = window.prompt("Fecha de inicio (AAAA-MM-DD)");
    const endDate = window.prompt("Fecha de término (AAAA-MM-DD)");
    const ownerName = window.prompt("Responsable");
    if (!name?.trim() || !startDate || !endDate || !ownerName?.trim()) return;
    try {
      const areasResponse = await fetch(`${apiUrl}/technical-areas`);
      if (!areasResponse.ok) throw new Error("No fue posible cargar las áreas técnicas");
      const areas = await areasResponse.json() as { id: string }[];
      if (!areas.length) throw new Error("Configura un área técnica antes de crear tareas.");
      const response = await fetch(`${apiUrl}/projects/${selectedProject.id}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), startDate, endDate, ownerName: ownerName.trim(), technicalAreaId: areas[0].id, progress: 0, dependency: "", isPhase: false }) });
      if (!response.ok) throw new Error("No fue posible crear la tarea");
      const task = await response.json() as Record<string, unknown>;
      const nextTasks = normalizeTasks([...(selectedProject.tasks ?? []) as unknown as Array<Record<string, unknown>>, task]);
      setTasks(nextTasks);
      const updatedProject = { ...selectedProject, tasks: [...(selectedProject.tasks ?? []), task] } as Project;
      setSelectedProject(updatedProject);
      setProjects((current) => current.map((project) => project.id === updatedProject.id ? updatedProject : project));
      setApiMessage("Tarea creada correctamente.");
      addNotification(`Tarea creada: ${name.trim()}.`);
    } catch (error) {
      setApiMessage(error instanceof Error ? error.message : "No fue posible crear la tarea");
    }
  }

  useEffect(() => {
    createTaskHandler = () => void createTask();
    return () => { createTaskHandler = undefined; };
    // The handler must remain registered while the selected project is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  async function updateProgress(id: string, progress: number) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, progress } : task));
    try {
      const response = await fetch(`${apiUrl}/tasks/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ progress }) });
      if (!response.ok) throw new Error("No fue posible guardar el progreso");
      addNotification(`Progreso actualizado a ${progress}%.`);
    } catch (error) {
      setApiMessage(error instanceof Error ? error.message : "No fue posible guardar el progreso");
    }
  }

  async function updateProject() {
    if (!selectedProject) return;
    const response = await fetch(`${apiUrl}/projects/${selectedProject.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: projectName.trim(), startDate: projectStartDate, endDate: projectEndDate, budget: Number(projectBudget), durationMonths: Number(projectDuration), ownerName: projectOwner.trim() }) });
    if (!response.ok) throw new Error("No fue posible actualizar el expediente");
    const project = await response.json() as Project;
    setProjects((current) => current.map((item) => item.id === project.id ? project : item));
    setSelectedProject(project);
    setShowEditProject(false);
    setApiMessage("Expediente actualizado correctamente.");
    addNotification(`Expediente actualizado: ${project.name}.`);
  }

  function openEditProject() {
    if (!selectedProject) return;
    setProjectName(selectedProject.name);
    setProjectStartDate(selectedProject.startDate.slice(0, 10));
    setProjectEndDate(selectedProject.endDate.slice(0, 10));
    setProjectDuration(String(selectedProject.durationMonths));
    setProjectOwner(selectedProject.ownerName);
    setProjectBudget(String(selectedProject.budget));
    setShowEditProject(true);
  }

  const visibleProjects = projects
    .filter((project) => project.name.toLowerCase().includes(projectSearch.toLowerCase()) || project.id.toLowerCase().includes(projectSearch.toLowerCase()))
    .filter((project) => statusFilter === "all" || (statusFilter === "completed" ? project.progress === 100 : project.progress < 100))
    .sort((first, second) => sortOrder === "name" ? first.name.localeCompare(second.name) : sortOrder === "progress" ? second.progress - first.progress : 0);

  if (isBooting) return <LoadingScreen />;

  if (!authenticated) {
    return (
      <main className={`login-shell theme-${theme}`}>
        <section className="login-art">
          <div className="brand-mark"><span>PP</span></div>
          <p className="eyebrow">PROJECT PLANNER / CONTROL DE OBRA</p>
          <h1>Convierte cada expediente en una ejecución clara.</h1>
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
    <main className={`app-shell theme-${theme}`}>
      <aside className="sidebar">
        <div className="sidebar-brand"><div className="brand-mark small"><span>PP</span></div><div><strong>PROJECT</strong><span>PLANNER</span></div></div>
        <div className="workspace-label">ESPACIO DE TRABAJO <span>⌄</span></div>
        <nav>
          <button className={activeView === "dashboard" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("dashboard")}><span>⌂</span> Dashboard</button>
          <button className={activeView === "projects" ? "nav-item active" : "nav-item"} onClick={() => setActiveView("projects")}><span>▦</span> Mis expedientes</button>
        </nav>
        <div className="sidebar-footer"><div className="profile"><div className="avatar">AR</div><div><strong>Alex Rodríguez</strong><span>Administrador</span></div><button onClick={() => setAuthenticated(false)}>⋮</button></div></div>
      </aside>
      <section className="main-area">
        <header className="topbar"><div className="breadcrumbs"><button onClick={() => setActiveView(activeView === "dashboard" ? "dashboard" : "projects")}>{activeView === "dashboard" ? "Dashboard" : "Mis expedientes"}</button>{activeView !== "dashboard" && activeView !== "projects" && selectedProject && <><b>/</b><button onClick={() => setActiveView("overview")}>{selectedProject.name}</button><b>/</b><strong>{activeView === "gantt" ? "Cronograma" : "Resumen"}</strong></>}</div><div className="top-actions"><button className="icon-button" aria-label="Buscar" onClick={() => setActiveView("projects")}>⌕</button><div className="notification-wrap"><button className="icon-button notification" aria-label="Notificaciones" aria-expanded={isNotificationsOpen} onClick={() => setIsNotificationsOpen((open) => !open)}>♧{notifications.length > 0 && <i />}</button>{isNotificationsOpen && <div className="notification-panel"><div className="notification-heading"><strong>Notificaciones</strong><button type="button" onClick={() => setNotifications([])}>Limpiar</button></div>{notifications.length ? notifications.map((notification) => <div className="notification-item" key={notification.id}><span className="notification-mark" /><div><strong>{notification.message}</strong><small>{notification.time}</small></div></div>) : <p className="muted">No hay actividad reciente.</p>}</div>}</div><button className="theme-toggle" onClick={toggleTheme} aria-label={`Activar modo ${theme === "light" ? "oscuro" : "claro"}`}><span>{theme === "light" ? "☾" : "☀"}</span><small>{theme === "light" ? "Oscuro" : "Claro"}</small></button><div className="avatar top-avatar">AR</div></div></header>
        {activeView === "dashboard" ? (
          <Dashboard projects={projects} onCreate={() => { setActiveView("projects"); setShowNewProject(true); }} onOpenProjects={() => setActiveView("projects")} onSelect={selectProject} />
        ) : activeView === "projects" ? (
          <div className="content projects-view"><div className="page-heading"><div><p className="eyebrow dark-eyebrow">GESTIÓN DE EXPEDIENTES</p><h1>Mis proyectos <span>({visibleProjects.length})</span></h1><p className="muted">Administra y da seguimiento al ciclo de vida de tus proyectos.</p>{apiMessage && <p className="api-message">{apiMessage}</p>}</div><button className="primary-button compact" onClick={() => setShowNewProject(true)}>＋ Nuevo expediente</button></div>
            <div className="project-toolbar"><div className="search-box">⌕ <input value={projectSearch} onChange={(event) => setProjectSearch(event.target.value)} placeholder="Buscar por nombre o ID..." aria-label="Buscar por nombre o ID" /></div><label className="filter-select">Estado<select className="filter-button" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}><option value="all">Todos</option><option value="active">En ejecución</option><option value="completed">Completados</option></select></label><label className="filter-select">Ordenar por<select className="filter-button" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)}><option value="recent">Más recientes</option><option value="name">Nombre</option><option value="progress">Progreso</option></select></label></div>
            <div className="project-grid">{visibleProjects.map((project, index) => <ProjectCard key={project.id} name={project.name} id={project.id} date={`${project.startDate.slice(0, 10)} — ${project.endDate.slice(0, 10)}`} duration={`${project.durationMonths} meses`} owner={project.ownerName} budget={`$ ${project.budget.toLocaleString("es-MX")}`} progress={project.progress} status={project.progress === 100 ? "Completado" : "En ejecución"} color={index % 3 === 0 ? "orange" : index % 3 === 1 ? "green" : "blue"} onClick={() => selectProject(project)} onDelete={() => void deleteProject(project)} />)}</div>
            {showNewProject && <div className="modal-backdrop"><form className="modal" onSubmit={(event) => { event.preventDefault(); setIsSavingProject(true); void createProject().catch((error: Error) => setApiMessage(error.message)).finally(() => setIsSavingProject(false)); }}><button className="modal-close" type="button" onClick={() => setShowNewProject(false)}>×</button><p className="eyebrow dark-eyebrow">NUEVO EXPEDIENTE</p><h2>Crear proyecto</h2><p className="muted">Registra los datos principales para iniciar la trazabilidad.</p><label>Nombre del proyecto<input value={projectName} onChange={(event) => setProjectName(event.target.value)} required /></label><div className="modal-row"><label>Fecha de inicio<input type="date" value={projectStartDate} onChange={(event) => setProjectStartDate(event.target.value)} required /></label><label>Fecha de término<input type="date" value={projectEndDate} onChange={(event) => setProjectEndDate(event.target.value)} required /></label></div><div className="modal-row"><label>Duración (meses)<input value={projectDuration} onChange={(event) => setProjectDuration(event.target.value)} type="number" min="1" required /></label><label>Responsable<input value={projectOwner} onChange={(event) => setProjectOwner(event.target.value)} required /></label></div><label>Presupuesto oficial<input value={projectBudget} onChange={(event) => setProjectBudget(event.target.value)} type="number" min="0" required /></label><button className="primary-button" type="submit" disabled={isSavingProject}>{isSavingProject ? "Guardando..." : "Crear expediente"} <span>→</span></button></form></div>}
            {showEditProject && <div className="modal-backdrop"><form className="modal" onSubmit={(event) => { event.preventDefault(); setIsSavingProject(true); void updateProject().catch((error: Error) => setApiMessage(error.message)).finally(() => setIsSavingProject(false)); }}><button className="modal-close" type="button" onClick={() => setShowEditProject(false)}>×</button><p className="eyebrow dark-eyebrow">EDITAR EXPEDIENTE</p><h2>Actualizar proyecto</h2><p className="muted">Los cambios se guardarán en la base de datos.</p><label>Nombre del proyecto<input value={projectName} onChange={(event) => setProjectName(event.target.value)} required /></label><div className="modal-row"><label>Fecha de inicio<input type="date" value={projectStartDate} onChange={(event) => setProjectStartDate(event.target.value)} required /></label><label>Fecha de término<input type="date" value={projectEndDate} onChange={(event) => setProjectEndDate(event.target.value)} required /></label></div><div className="modal-row"><label>Duración (meses)<input value={projectDuration} onChange={(event) => setProjectDuration(event.target.value)} type="number" min="1" required /></label><label>Responsable<input value={projectOwner} onChange={(event) => setProjectOwner(event.target.value)} required /></label></div><label>Presupuesto oficial<input value={projectBudget} onChange={(event) => setProjectBudget(event.target.value)} type="number" min="0" required /></label><button className="primary-button" type="submit" disabled={isSavingProject}>{isSavingProject ? "Guardando..." : "Guardar cambios"} <span>→</span></button></form></div>}
          </div>
        ) : (
          <div className="content detail-view"><div className="detail-heading"><button className="back-button" onClick={() => setActiveView("projects")}>← Todos los proyectos</button><div className="detail-title"><div><div className="id-line"><span className="project-id">{selectedProject?.id ?? "Sin expediente seleccionado"}</span>{selectedProject && <span className="status-pill orange">{selectedProject.progress === 100 ? "Completado" : "En ejecución"}</span>}</div><h1>{selectedProject?.name ?? "Expediente vacío"}</h1><p className="muted">Responsable: {selectedProject?.ownerName ?? "Sin responsable"}</p></div><div className="detail-actions"><button className="secondary-button" onClick={openEditProject}>Editar expediente</button><button className="secondary-button" onClick={() => selectedProject && void deleteProject(selectedProject)}>Eliminar expediente</button></div></div></div><div className="tabs"><button className={!isGantt ? "tab active" : "tab"} onClick={() => setActiveView("overview")}>Resumen del expediente</button><button className={isGantt ? "tab active" : "tab"} onClick={() => setActiveView("gantt")}>Cronograma Gantt <span>{selectedProject?.tasks?.length ?? 0}</span></button></div>
            {!isGantt ? <><div className="summary-grid"><Metric title="Presupuesto asignado" value={selectedProject ? `$ ${selectedProject.budget.toLocaleString("es-MX")}` : "$ 0"} note={selectedProject ? "Presupuesto oficial" : "Sin proyecto seleccionado"} /><Metric title="Duración global" value={selectedProject ? `${selectedProject.durationMonths} meses` : "0 meses"} note={selectedProject ? `${selectedProject.startDate.slice(0, 10)} — ${selectedProject.endDate.slice(0, 10)}` : "Sin fechas registradas"} /><Metric title="Progreso general" value={`${selectedProject?.progress ?? 0}%`} note={`${selectedProject?.tasks?.length ?? 0} tareas registradas`} progress={selectedProject?.progress ?? 0} /></div><div className="detail-columns"><section className="panel"><div className="panel-heading"><div><p className="eyebrow dark-eyebrow">EQUIPO DEL PROYECTO</p><h2>Participantes <span className="count">{selectedProject?.teamMembers?.length ?? 0}</span></h2></div><button className="small-action" onClick={() => void addMember()}>＋ Añadir</button></div>{selectedProject?.teamMembers?.length ? selectedProject.teamMembers.map((member) => <Member key={member.id} name={member.name} role="Participante del proyecto" initials={member.name.split(" ").map((part) => part[0]).join("")} status={member.teamStatus.type} />) : <p className="muted empty-state">No hay participantes registrados.</p>}</section><section className="panel milestones"><div className="panel-heading"><div><p className="eyebrow dark-eyebrow">FECHAS CLAVE</p><h2>Hitos del proyecto <span className="count">{selectedProject?.milestones?.length ?? 0}</span></h2></div><button className="small-action" onClick={() => void addMilestone()}>＋ Añadir</button></div>{selectedProject?.milestones?.length ? selectedProject.milestones.map((milestone) => <Milestone key={milestone.id} date={milestone.date.slice(0, 10)} title={milestone.description} />) : <p className="muted empty-state">No hay hitos registrados.</p>}</section></div></> : <Gantt tasks={tasks} editingTask={editingTask} setEditingTask={setEditingTask} updateProgress={updateProgress} mode={ganttMode} setMode={setGanttMode} />}
          </div>
        )}
      </section>
    </main>
  );
}

function LoadingScreen() {
  return <main className="loading-screen" aria-label="Cargando Project Planner"><div className="loading-brand"><div className="brand-mark"><span>PP</span></div><strong>PROJECT <em>PLANNER</em></strong></div><div className="loading-track" role="progressbar" aria-label="Cargando aplicación"><i /></div><p>Preparando tu espacio de trabajo</p></main>;
}

function Dashboard({ projects, onCreate, onOpenProjects, onSelect }: { projects: Project[]; onCreate: () => void; onOpenProjects: () => void; onSelect: (project: Project) => void }) {
  const activeProjects = projects.filter((project) => project.progress < 100).length;
  const completedProjects = projects.filter((project) => project.progress === 100).length;
  const totalBudget = projects.reduce((total, project) => total + project.budget, 0);
  const averageProgress = projects.length ? Math.round(projects.reduce((total, project) => total + project.progress, 0) / projects.length) : 0;

  return <div className="content dashboard-view">
    <div className="dashboard-hero"><div><p className="eyebrow dark-eyebrow">CENTRO DE CONTROL / AGOSTO 2026</p><h1>Buenos días, Alex<span>.</span></h1><p className="muted">Una lectura rápida de tus expedientes y las decisiones que requieren atención.</p></div><button className="primary-button hero-action" onClick={onCreate}>＋ Crear expediente <span>→</span></button></div>
    <div className="dashboard-stats"><Metric title="Expedientes activos" value={String(activeProjects).padStart(2, "0")} note={`${projects.length} registrados en total`} /><Metric title="Presupuesto en cartera" value={`$ ${totalBudget.toLocaleString("es-MX")}`} note="Suma de expedientes registrados" /><Metric title="Avance promedio" value={`${averageProgress}%`} note={`${completedProjects} expedientes completados`} progress={averageProgress} /></div>
    <div className="dashboard-grid"><section className="dashboard-panel spotlight"><div className="panel-heading"><div><p className="eyebrow dark-eyebrow">SEGUIMIENTO</p><h2>Actividad reciente</h2></div><button className="text-button" onClick={onOpenProjects}>Ver todos →</button></div>{projects.length ? projects.slice(0, 4).map((project, index) => <button className="activity-row" key={project.id} onClick={() => onSelect(project)}><span className={`activity-mark mark-${index % 3}`} /> <span><strong>{project.name}</strong><small>{project.ownerName} · Actualizado recientemente</small></span><b>{project.progress}%</b><span className="row-arrow">→</span></button>) : <div className="dashboard-empty"><span>✦</span><strong>Tu espacio empieza aquí</strong><p>Crea tu primer expediente para comenzar a ver avances, presupuesto y fechas clave.</p><button className="secondary-button" onClick={onCreate}>Crear primer expediente</button></div>}</section><section className="dashboard-panel pulse"><p className="eyebrow dark-eyebrow">LECTURA DEL PORTAFOLIO</p><h2>Estado general</h2><div className="ring-wrap"><div className="progress-ring" style={{ "--progress": `${averageProgress * 3.6}deg` } as React.CSSProperties}><strong>{averageProgress}%</strong><span>avance medio</span></div></div><div className="status-list"><span><i className="status-dot active-dot" /> En ejecución <b>{activeProjects}</b></span><span><i className="status-dot done-dot" /> Completados <b>{completedProjects}</b></span></div></section></div>
  </div>;
}

function ProjectCard({ name, id, date, duration, owner, budget, progress, status, color, onClick, onDelete }: { name: string; id: string; date: string; duration: string; owner: string; budget: string; progress: number; status: string; color: string; onClick: () => void; onDelete: () => void }) {
  return <article className="project-card-shell"><button className="project-card" onClick={onClick}><div className={`card-accent ${color}`} /><div className="card-top"><span className={`status-pill ${color}`}>{status}</span><span className="more">⋮</span></div><h2>{name}</h2><span className="project-id">{id}</span><div className="card-meta"><span>◷ {date}</span><span>▣ {budget}</span></div><div className="card-meta secondary-meta"><span>Duración: {duration}</span><span>Responsable: {owner}</span></div><div className="card-progress"><div><span>Progreso</span><strong>{progress}%</strong></div><div className="progress-track"><i style={{ width: `${progress}%` }} /></div></div><span className="open-link">Abrir expediente →</span></button><button className="delete-project" type="button" onClick={onDelete} aria-label={`Eliminar expediente ${name}`} title="Eliminar expediente">×</button></article>;
}

function Metric({ title, value, note, progress }: { title: string; value: string; note: string; progress?: number }) { return <div className="metric"><span className="metric-title">{title}</span><strong>{value}</strong>{progress !== undefined && <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>}<span className="metric-note">{note}</span></div>; }
function Member({ name, role, initials, status }: { name: string; role: string; initials: string; status: string }) { return <div className="member"><div className="avatar">{initials}</div><div><strong>{name}</strong><span>{role}</span></div><span className={`member-status ${status.toLowerCase()}`}>{status}</span></div>; }
function Milestone({ date, title, done }: { date: string; title: string; done?: boolean }) { return <div className="milestone"><div className={done ? "milestone-dot done" : "milestone-dot"}>{done ? "✓" : ""}</div><div><span>{date}</span><strong>{title}</strong></div><button type="button" onClick={() => window.alert(`Hito: ${title}\nFecha: ${date}`)} aria-label={`Ver opciones del hito ${title}`}>⋮</button></div>; }

function Gantt({ tasks, editingTask, setEditingTask, updateProgress, mode, setMode }: { tasks: Task[]; editingTask: string | null; setEditingTask: (id: string | null) => void; updateProgress: (id: string, progress: number) => void; mode: "month" | "week"; setMode: (mode: "month" | "week") => void }) {
  useEffect(() => {
    const newTaskButton = document.querySelector(".gantt-panel .small-action");
    if (!newTaskButton) return;
    const handleNewTask = () => createTaskHandler?.();
    newTaskButton.addEventListener("click", handleNewTask);
    return () => newTaskButton.removeEventListener("click", handleNewTask);
  }, []);
  useEffect(() => {
    const viewButton = document.querySelector(".gantt-panel .secondary-button");
    if (!viewButton) return;
    const handleViewChange = () => setMode(mode === "month" ? "week" : "month");
    viewButton.addEventListener("click", handleViewChange);
    return () => {
      viewButton.removeEventListener("click", handleViewChange);
    };
  }, [mode, setMode]);
  return <section className="gantt-panel"><div className="gantt-header"><div><p className="eyebrow dark-eyebrow">PLANIFICACIÓN DETALLADA</p><h2>Cronograma de ejecución</h2><p className="muted">Haz clic en cualquier tarea para modificar su progreso o responsable.</p></div><div><button className="secondary-button">⊞ Vista: Mes</button><button className="small-action">＋ Nueva tarea</button></div></div><div className="gantt-tools"><span>{tasks.length} elementos · {tasks.filter((task) => task.phase).length} fases</span><span className="legend"><i className="legend-dot complete" /> Completada <i className="legend-dot current" /> En curso <i className="legend-dot delayed" /> Atención</span></div><div className="gantt-table"><div className="task-head"><span>TAREA / FASE</span><span>RESPONSABLE / ÁREA</span><span>FECHAS / DEP.</span><span>PROGRESO</span><div className="timeline-head"><span>03 JUN</span><span>10 JUN</span><span>17 JUN</span><span>24 JUN</span></div></div>{tasks.map((task) => <div className={task.phase ? "task-row phase-row" : "task-row"} key={task.id} onClick={() => !task.phase && setEditingTask(editingTask === task.id ? null : task.id)}><div className="task-name"><span className="drag">⠿</span><span className="task-number">{task.id}</span><strong>{task.name}</strong></div><span className="owner"><span className="avatar mini">{task.owner.split(" ").map((part) => part[0]).join("")}</span><span>{task.owner}<small>{task.technicalArea} · {task.metrics} métricas · {task.driveLinks} Drive</small></span></span><span className="dates">{task.start}<br />{task.end}<small>Depende de: {task.dependency ?? "—"}</small></span><div className="task-progress"><strong>{task.progress}%</strong><div className="progress-track"><i style={{ width: `${task.progress}%` }} /></div></div><div className="timeline"><div className={`gantt-bar ${task.progress === 100 ? "complete" : task.progress < 30 ? "delayed" : "current"}`} style={getBarStyle(task)}>{task.phase && <span>FASE</span>}</div></div>{editingTask === task.id && <div className="edit-popover"><strong>Modificando tarea</strong><label>Progreso <input type="range" min="0" max="100" value={task.progress} onChange={(event) => updateProgress(task.id, Number(event.target.value))} /></label><span>{task.progress}% completado</span></div>}</div>)}</div></section>;
}
