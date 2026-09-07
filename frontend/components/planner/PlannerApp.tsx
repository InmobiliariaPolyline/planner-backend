"use client";

import { useCallback, useEffect, useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/lib/api";
import { normalizeTasks } from "@/lib/normalize";
import type { ActiveView, GanttMode, Project, ProjectFormValues, RawTask, Task } from "@/lib/types";
import { AppShell } from "./AppShell";
import { DashboardView } from "./DashboardView";
import { GanttChart } from "./GanttChart";
import { ProjectDetailView } from "./ProjectDetailView";
import { ProjectFormModal, projectToForm } from "./ProjectFormModal";
import { ProjectsView } from "./ProjectsView";
import { LoadingScreen, LoginScreen } from "./Screens";
import { ShareManager } from "./ShareManager";

type ModalState = null | "create" | "edit" | "share";

export function PlannerApp() {
  const { theme, toggleTheme } = useTheme();
  const { notifications, notify, clear: clearNotifications } = useNotifications();

  const [isBooting, setIsBooting] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ganttMode, setGanttMode] = useState<GanttMode>("month");
  const [apiMessage, setApiMessage] = useState("");
  const [modal, setModal] = useState<ModalState>(null);

  useEffect(() => {
    // Un poco más que la animación de la barra de carga (1.4 s) para que llegue a 100 %.
    const timer = window.setTimeout(() => setIsBooting(false), 1600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    api
      .listProjects()
      .then((data) => {
        setProjects(data);
        setApiMessage("");
        if (data.length) {
          const plural = data.length === 1 ? "" : "s";
          notify(`${data.length} expediente${plural} cargado${plural} desde Neon.`);
        }
      })
      .catch(() => {
        setProjects([]);
        setApiMessage("API no disponible. No se cargaron proyectos locales.");
        notify("No fue posible conectar con la API de Render.");
      });
  }, [authenticated, notify]);

  const patchProjectInState = useCallback((updated: Project) => {
    setProjects((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedProject((current) => (current && current.id === updated.id ? updated : current));
  }, []);

  const selectProject = useCallback((project: Project) => {
    setSelectedProject(project);
    setTasks(normalizeTasks((project.tasks ?? []) as RawTask[]));
    setActiveView("overview");
  }, []);

  const navigate = useCallback((view: ActiveView) => setActiveView(view), []);

  async function createProject(values: ProjectFormValues) {
    if (
      !values.name.trim() ||
      !values.startDate ||
      !values.endDate ||
      !values.durationMonths ||
      !values.ownerName.trim() ||
      !values.budget
    ) {
      throw new Error("Completa todos los campos del expediente");
    }
    const project = await api.createProject({
      name: values.name.trim(),
      startDate: values.startDate,
      endDate: values.endDate,
      budget: Number(values.budget),
      durationMonths: Number(values.durationMonths),
      ownerName: values.ownerName.trim(),
    });
    setProjects((current) => [project, ...current]);
    setSelectedProject(project);
    setModal(null);
    setApiMessage("Expediente creado correctamente.");
    notify(`Expediente creado: ${project.name}.`);
  }

  async function updateProject(values: ProjectFormValues) {
    if (!selectedProject) return;
    const project = await api.updateProject(selectedProject.id, {
      name: values.name.trim(),
      startDate: values.startDate,
      endDate: values.endDate,
      budget: Number(values.budget),
      durationMonths: Number(values.durationMonths),
      ownerName: values.ownerName.trim(),
    });
    patchProjectInState(project);
    setSelectedProject(project);
    setModal(null);
    setApiMessage("Expediente actualizado correctamente.");
    notify(`Expediente actualizado: ${project.name}.`);
  }

  async function deleteProject(project: Project) {
    if (!window.confirm(`¿Eliminar el expediente "${project.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await api.deleteProject(project.id);
      setProjects((current) => current.filter((item) => item.id !== project.id));
      if (selectedProject?.id === project.id) {
        setSelectedProject(null);
        setActiveView("projects");
      }
      setApiMessage("Expediente eliminado correctamente.");
      notify(`Expediente eliminado: ${project.name}.`);
    } catch (error) {
      setApiMessage(error instanceof Error ? error.message : "No fue posible eliminar el expediente");
    }
  }

  async function addMember() {
    if (!selectedProject) return;
    const name = window.prompt("Nombre del participante");
    if (!name?.trim()) return;
    try {
      const statuses = await api.listTeamStatuses();
      if (!statuses.length) {
        throw new Error("Configura al menos un estado de equipo antes de añadir participantes.");
      }
      const member = await api.createTeamMember(selectedProject.id, {
        name: name.trim(),
        teamStatusId: statuses[0].id,
      });
      const updated: Project = {
        ...selectedProject,
        teamMembers: [...(selectedProject.teamMembers ?? []), member],
      };
      patchProjectInState(updated);
      setApiMessage("Participante añadido correctamente.");
      notify(`Participante añadido a ${selectedProject.name}.`);
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
      const milestone = await api.createMilestone(selectedProject.id, {
        description: description.trim(),
        date,
      });
      const updated: Project = {
        ...selectedProject,
        milestones: [...(selectedProject.milestones ?? []), milestone],
      };
      patchProjectInState(updated);
      setApiMessage("Hito añadido correctamente.");
      notify(`Hito añadido a ${selectedProject.name}.`);
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
      const areas = await api.listTechnicalAreas();
      if (!areas.length) {
        throw new Error("Configura un área técnica antes de crear tareas.");
      }
      const task = await api.createTask(selectedProject.id, {
        name: name.trim(),
        startDate,
        endDate,
        ownerName: ownerName.trim(),
        technicalAreaId: areas[0].id,
        progress: 0,
        dependency: "",
        isPhase: false,
      });
      const rawTasks = [...((selectedProject.tasks ?? []) as RawTask[]), task];
      setTasks(normalizeTasks(rawTasks));
      const updated: Project = { ...selectedProject, tasks: rawTasks };
      patchProjectInState(updated);
      setApiMessage("Tarea creada correctamente.");
      notify(`Tarea creada: ${name.trim()}.`);
    } catch (error) {
      setApiMessage(error instanceof Error ? error.message : "No fue posible crear la tarea");
    }
  }

  async function updateProgress(id: string, progress: number) {
    const previous = tasks.find((task) => task.id === id)?.progress ?? 0;
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, progress } : task)));
    try {
      await api.updateTaskProgress(id, progress);
      notify(`Progreso actualizado a ${progress}%.`);
    } catch (error) {
      setTasks((current) =>
        current.map((task) => (task.id === id ? { ...task, progress: previous } : task)),
      );
      setApiMessage(error instanceof Error ? error.message : "No fue posible guardar el progreso");
    }
  }

  if (isBooting) return <LoadingScreen />;

  if (!authenticated) {
    return <LoginScreen projectCount={projects.length} onEnter={() => setAuthenticated(true)} />;
  }

  const detailTab: "overview" | "gantt" = activeView === "gantt" ? "gantt" : "overview";

  return (
    <>
      <AppShell
        activeView={activeView}
        selectedProject={selectedProject}
        theme={theme}
        notifications={notifications}
        onNavigate={navigate}
        onToggleTheme={toggleTheme}
        onClearNotifications={clearNotifications}
        onSignOut={() => setAuthenticated(false)}
      >
        {activeView === "dashboard" && (
          <DashboardView
            projects={projects}
            onCreate={() => {
              setActiveView("projects");
              setModal("create");
            }}
            onOpenProjects={() => setActiveView("projects")}
            onSelect={selectProject}
          />
        )}

        {activeView === "projects" && (
          <ProjectsView
            projects={projects}
            apiMessage={apiMessage}
            onCreate={() => setModal("create")}
            onSelect={selectProject}
            onDelete={(project) => void deleteProject(project)}
          />
        )}

        {(activeView === "overview" || activeView === "gantt") && selectedProject && (
          <ProjectDetailView
            project={selectedProject}
            taskCount={selectedProject.tasks?.length ?? 0}
            activeTab={detailTab}
            banner={apiMessage}
            onTab={(tab) => setActiveView(tab)}
            onBack={() => setActiveView("projects")}
            onEdit={() => setModal("edit")}
            onDelete={() => void deleteProject(selectedProject)}
            onShare={() => setModal("share")}
            onAddMember={() => void addMember()}
            onAddMilestone={() => void addMilestone()}
            gantt={
              <GanttChart
                tasks={tasks}
                mode={ganttMode}
                onToggleMode={() => setGanttMode((mode) => (mode === "month" ? "week" : "month"))}
                onCreateTask={() => void createTask()}
                onUpdateProgress={updateProgress}
              />
            }
          />
        )}

        {(activeView === "overview" || activeView === "gantt") && !selectedProject && (
          <div className="view">
            <p className="banner">Selecciona un expediente para ver su detalle.</p>
          </div>
        )}
      </AppShell>

      {modal === "create" && (
        <ProjectFormModal
          mode="create"
          onClose={() => setModal(null)}
          onSubmit={createProject}
        />
      )}
      {modal === "edit" && selectedProject && (
        <ProjectFormModal
          mode="edit"
          initialValues={projectToForm(selectedProject)}
          onClose={() => setModal(null)}
          onSubmit={updateProject}
        />
      )}
      {modal === "share" && selectedProject && (
        <ShareManager
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
