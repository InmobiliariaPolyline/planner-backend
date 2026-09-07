"use client";

import { useCallback, useEffect, useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "@/hooks/useTheme";
import { api, onServerWaking } from "@/lib/api";
import { normalizeTasks, toTaskDetail } from "@/lib/normalize";
import type {
  ActiveView,
  GanttMode,
  Milestone,
  Project,
  ProjectFormValues,
  RawTask,
  Task,
  TaskDetail,
  TaskFormValues,
  TeamStatusOption,
  TechnicalArea,
} from "@/lib/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { AppShell } from "./AppShell";
import { DashboardView } from "./DashboardView";
import { GanttChart } from "./GanttChart";
import { MemberFormModal } from "./MemberFormModal";
import { MilestoneFormModal } from "./MilestoneFormModal";
import { ProjectDetailView } from "./ProjectDetailView";
import { ProjectFormModal, projectToForm } from "./ProjectFormModal";
import { ProjectsView } from "./ProjectsView";
import { LoadingScreen, LoginScreen } from "./Screens";
import { ShareManager } from "./ShareManager";
import { TaskFormModal } from "./TaskFormModal";

type Modal =
  | null
  | { kind: "projectCreate" }
  | { kind: "projectEdit" }
  | { kind: "share" }
  | { kind: "taskCreate" }
  | { kind: "taskEdit"; task: TaskDetail }
  | { kind: "member" }
  | { kind: "milestoneCreate" }
  | { kind: "milestoneEdit"; milestone: Milestone }
  | { kind: "confirm"; title: string; message: string; confirmLabel: string; onConfirm: () => Promise<void> };

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
  const [serverWaking, setServerWaking] = useState(false);
  const [modal, setModal] = useState<Modal>(null);

  const [technicalAreas, setTechnicalAreas] = useState<TechnicalArea[]>([]);
  const [teamStatuses, setTeamStatuses] = useState<TeamStatusOption[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsBooting(false), 1600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    onServerWaking(() => setServerWaking(true));
    return () => onServerWaking(null);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    api
      .listProjects()
      .then((data) => {
        setProjects(data);
        setApiMessage("");
        setServerWaking(false);
      })
      .catch(() => {
        setProjects([]);
        setApiMessage("API no disponible. Revisa tu conexión o inténtalo de nuevo en un momento.");
        setServerWaking(false);
      });
    api.listTechnicalAreas().then(setTechnicalAreas).catch(() => undefined);
    api.listTeamStatuses().then(setTeamStatuses).catch(() => undefined);
  }, [authenticated]);

  const setProjectEverywhere = useCallback((updated: Project) => {
    setProjects((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedProject((current) => (current && current.id === updated.id ? updated : current));
    setTasks((current) => {
      const isSelected = updated.tasks !== undefined;
      return isSelected ? normalizeTasks((updated.tasks ?? []) as RawTask[]) : current;
    });
  }, []);

  const refreshProject = useCallback(
    async (projectId: string) => {
      try {
        const fresh = await api.getProject(projectId);
        setProjectEverywhere(fresh);
      } catch {
        /* si falla, se conserva el estado actual */
      }
    },
    [setProjectEverywhere],
  );

  const selectProject = useCallback((project: Project) => {
    setSelectedProject(project);
    setTasks(normalizeTasks((project.tasks ?? []) as RawTask[]));
    setActiveView("overview");
    void api.getProject(project.id).then((fresh) => {
      setSelectedProject(fresh);
      setTasks(normalizeTasks((fresh.tasks ?? []) as RawTask[]));
    });
  }, []);

  const navigate = useCallback((view: ActiveView) => setActiveView(view), []);
  const closeModal = useCallback(() => setModal(null), []);

  // ── Catálogos ────────────────────────────────────────────────────────────
  async function createTechnicalArea(name: string) {
    const area = await api.createTechnicalArea(name);
    setTechnicalAreas((current) => [...current, area].sort((a, b) => a.name.localeCompare(b.name)));
    return area;
  }
  async function createTeamStatus(type: string) {
    const status = await api.createTeamStatus(type);
    setTeamStatuses((current) => [...current, status].sort((a, b) => a.type.localeCompare(b.type)));
    return status;
  }

  // ── Proyectos ────────────────────────────────────────────────────────────
  async function createProject(values: ProjectFormValues) {
    const project = await api.createProject({
      name: values.name.trim(),
      startDate: values.startDate,
      endDate: values.endDate,
      budget: Number(values.budget),
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
      ownerName: values.ownerName.trim(),
    });
    setProjectEverywhere(project);
    setModal(null);
    setApiMessage("Expediente actualizado correctamente.");
    notify(`Expediente actualizado: ${project.name}.`);
  }

  function askDeleteProject(project: Project) {
    setModal({
      kind: "confirm",
      title: "Eliminar expediente",
      message: `Se eliminará "${project.name}" y todo su contenido (tareas, hitos, equipo, enlaces). No se puede deshacer.`,
      confirmLabel: "Eliminar expediente",
      onConfirm: async () => {
        await api.deleteProject(project.id);
        setProjects((current) => current.filter((item) => item.id !== project.id));
        if (selectedProject?.id === project.id) {
          setSelectedProject(null);
          setActiveView("projects");
        }
        setApiMessage("Expediente eliminado correctamente.");
        notify(`Expediente eliminado: ${project.name}.`);
      },
    });
  }

  // ── Participantes ────────────────────────────────────────────────────────
  async function addMember(data: { name: string; teamStatusId: string }) {
    if (!selectedProject) return;
    await api.createTeamMember(selectedProject.id, data);
    await refreshProject(selectedProject.id);
    setModal(null);
    notify(`Participante añadido a ${selectedProject.name}.`);
  }
  function askDeleteMember(id: string, name: string) {
    if (!selectedProject) return;
    const projectId = selectedProject.id;
    setModal({
      kind: "confirm",
      title: "Eliminar participante",
      message: `Quitar a "${name}" del equipo del proyecto.`,
      confirmLabel: "Eliminar",
      onConfirm: async () => {
        await api.deleteTeamMember(id);
        await refreshProject(projectId);
      },
    });
  }

  // ── Hitos ────────────────────────────────────────────────────────────────
  async function saveMilestone(data: { description: string; date: string }, milestone?: Milestone) {
    if (!selectedProject) return;
    if (milestone) await api.updateMilestone(milestone.id, data);
    else await api.createMilestone(selectedProject.id, data);
    await refreshProject(selectedProject.id);
    setModal(null);
    notify(milestone ? "Hito actualizado." : `Hito añadido a ${selectedProject.name}.`);
  }
  function askDeleteMilestone(milestone: Milestone) {
    if (!selectedProject) return;
    const projectId = selectedProject.id;
    setModal({
      kind: "confirm",
      title: "Eliminar hito",
      message: `Eliminar el hito "${milestone.description}".`,
      confirmLabel: "Eliminar",
      onConfirm: async () => {
        await api.deleteMilestone(milestone.id);
        await refreshProject(projectId);
      },
    });
  }

  // ── Tareas ───────────────────────────────────────────────────────────────
  async function saveTask(values: TaskFormValues, existing?: TaskDetail) {
    if (!selectedProject) return;
    const payload = {
      name: values.name.trim(),
      ownerName: values.ownerName.trim(),
      startDate: values.startDate,
      endDate: values.endDate,
      technicalAreaId: values.technicalAreaId,
      isPhase: values.isPhase,
      dependency: values.dependency.trim(),
    };
    if (existing) await api.updateTask(existing.id, payload);
    else await api.createTask(selectedProject.id, { ...payload, progress: 0 });
    await refreshProject(selectedProject.id);
    setModal(null);
    notify(existing ? "Tarea actualizada." : `Tarea creada: ${payload.name}.`);
  }
  function askDeleteTask(task: Task) {
    if (!selectedProject) return;
    const projectId = selectedProject.id;
    setModal({
      kind: "confirm",
      title: "Eliminar tarea",
      message: `Eliminar la tarea "${task.name}" del cronograma.`,
      confirmLabel: "Eliminar",
      onConfirm: async () => {
        await api.deleteTask(task.id);
        await refreshProject(projectId);
      },
    });
  }
  function openTaskEdit(taskId: string) {
    const raw = (selectedProject?.tasks ?? []).find((t) => String((t as RawTask).id) === taskId);
    if (raw) setModal({ kind: "taskEdit", task: toTaskDetail(raw as RawTask) });
  }

  async function commitProgress(id: string, progress: number) {
    const previous = tasks.find((task) => task.id === id)?.progress ?? 0;
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, progress } : task)));
    try {
      await api.updateTaskProgress(id, progress);
      if (selectedProject) void refreshProject(selectedProject.id);
    } catch (error) {
      setTasks((current) => current.map((task) => (task.id === id ? { ...task, progress: previous } : task)));
      setApiMessage(error instanceof Error ? error.message : "No fue posible guardar el progreso");
    }
  }

  if (isBooting) return <LoadingScreen />;
  if (!authenticated) {
    return <LoginScreen projectCount={projects.length} onEnter={() => setAuthenticated(true)} />;
  }

  const detailTab: "overview" | "gantt" = activeView === "gantt" ? "gantt" : "overview";
  const banner = serverWaking ? "Conectando con el servidor… (puede tardar si estaba inactivo)" : apiMessage;

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
              setModal({ kind: "projectCreate" });
            }}
            onOpenProjects={() => setActiveView("projects")}
            onSelect={selectProject}
          />
        )}

        {activeView === "projects" && (
          <ProjectsView
            projects={projects}
            apiMessage={banner}
            onCreate={() => setModal({ kind: "projectCreate" })}
            onSelect={selectProject}
            onDelete={askDeleteProject}
          />
        )}

        {(activeView === "overview" || activeView === "gantt") && selectedProject && (
          <ProjectDetailView
            project={selectedProject}
            taskCount={selectedProject.tasks?.length ?? 0}
            activeTab={detailTab}
            banner={banner}
            onTab={(tab) => setActiveView(tab)}
            onBack={() => setActiveView("projects")}
            onEdit={() => setModal({ kind: "projectEdit" })}
            onDelete={() => askDeleteProject(selectedProject)}
            onShare={() => setModal({ kind: "share" })}
            onAddMember={() => setModal({ kind: "member" })}
            onDeleteMember={askDeleteMember}
            onAddMilestone={() => setModal({ kind: "milestoneCreate" })}
            onEditMilestone={(milestone) => setModal({ kind: "milestoneEdit", milestone })}
            onDeleteMilestone={askDeleteMilestone}
            gantt={
              <GanttChart
                tasks={tasks}
                mode={ganttMode}
                onToggleMode={() => setGanttMode((mode) => (mode === "month" ? "week" : "month"))}
                onCreateTask={() => setModal({ kind: "taskCreate" })}
                onEditTask={openTaskEdit}
                onDeleteTask={askDeleteTask}
                onCommitProgress={commitProgress}
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

      {modal?.kind === "projectCreate" && (
        <ProjectFormModal mode="create" onClose={closeModal} onSubmit={createProject} />
      )}
      {modal?.kind === "projectEdit" && selectedProject && (
        <ProjectFormModal
          mode="edit"
          initialValues={projectToForm(selectedProject)}
          onClose={closeModal}
          onSubmit={updateProject}
        />
      )}
      {modal?.kind === "share" && selectedProject && (
        <ShareManager projectId={selectedProject.id} projectName={selectedProject.name} onClose={closeModal} />
      )}
      {modal?.kind === "taskCreate" && selectedProject && (
        <TaskFormModal
          mode="create"
          technicalAreas={technicalAreas}
          onCreateArea={createTechnicalArea}
          onSubmit={(values) => saveTask(values)}
          onClose={closeModal}
        />
      )}
      {modal?.kind === "taskEdit" && selectedProject && (
        <TaskFormModal
          mode="edit"
          initialTask={modal.task}
          technicalAreas={technicalAreas}
          onCreateArea={createTechnicalArea}
          onSubmit={(values) => saveTask(values, modal.task)}
          onExtrasChanged={() => void refreshProject(selectedProject.id)}
          onClose={closeModal}
        />
      )}
      {modal?.kind === "member" && selectedProject && (
        <MemberFormModal
          statuses={teamStatuses}
          onCreateStatus={createTeamStatus}
          onSubmit={addMember}
          onClose={closeModal}
        />
      )}
      {modal?.kind === "milestoneCreate" && selectedProject && (
        <MilestoneFormModal onSubmit={(data) => saveMilestone(data)} onClose={closeModal} />
      )}
      {modal?.kind === "milestoneEdit" && selectedProject && (
        <MilestoneFormModal
          milestone={modal.milestone}
          onSubmit={(data) => saveMilestone(data, modal.milestone)}
          onClose={closeModal}
        />
      )}
      {modal?.kind === "confirm" && (
        <ConfirmDialog
          title={modal.title}
          message={modal.message}
          confirmLabel={modal.confirmLabel}
          onConfirm={modal.onConfirm}
          onClose={closeModal}
        />
      )}
    </>
  );
}
