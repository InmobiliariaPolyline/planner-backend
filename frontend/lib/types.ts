// Tipos compartidos del planner. El backend Express devuelve los proyectos con
// sus relaciones anidadas (tasks, milestones, teamMembers).

export type RawTask = Record<string, unknown>;

export type Task = {
  id: string;
  name: string;
  owner: string;
  /** "03 jun" — solo para mostrar */
  start: string;
  end: string;
  /** ISO 8601 — para cálculos (geometría del Gantt) */
  startISO: string;
  endISO: string;
  progress: number;
  phase: boolean;
  dependency: string;
  technicalArea: string;
  metrics: number;
  driveLinks: number;
};

export type PerformanceMetric = {
  id: string;
  unit: string;
  ratePerDay: number;
  divisor: number;
};

export type DriveLink = {
  id: string;
  url: string;
};

/** Tarea con sus relaciones, tal como llega del backend (para la edición). */
export type TaskDetail = {
  id: string;
  name: string;
  ownerName: string;
  startDate: string;
  endDate: string;
  progress: number;
  isPhase: boolean;
  dependency: string;
  technicalAreaId: string;
  technicalArea?: { id: string; name: string } | null;
  performanceMetrics?: PerformanceMetric[];
  driveLinks?: DriveLink[];
};

export type TechnicalArea = { id: string; name: string };
export type TeamStatusOption = { id: string; type: string };

export type Milestone = {
  id: string;
  description: string;
  date: string;
};

export type TeamMember = {
  id: string;
  name: string;
  teamStatus: { type: string };
};

export type Project = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  budget: number;
  durationMonths: number;
  progress: number;
  ownerName: string;
  tasks?: RawTask[];
  milestones?: Milestone[];
  teamMembers?: TeamMember[];
};

export type StatusFilter = "all" | "active" | "completed";
export type SortOrder = "recent" | "name" | "progress";
export type GanttMode = "month" | "week";
export type ActiveView = "dashboard" | "projects" | "overview" | "gantt";

export type Notification = {
  id: number;
  message: string;
  /** epoch ms; el texto relativo ("hace 5 min") se calcula al renderizar */
  createdAt: number;
};

export type ProjectFormValues = {
  name: string;
  startDate: string;
  endDate: string;
  ownerName: string;
  budget: string;
};

export type TaskFormValues = {
  name: string;
  ownerName: string;
  startDate: string;
  endDate: string;
  technicalAreaId: string;
  isPhase: boolean;
  dependency: string;
};

export type ShareRole = "viewer" | "editor";

export type ShareLink = {
  id: string;
  token: string;
  role: ShareRole;
  label: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
};

/** Respuesta de GET /shared/:token */
export type SharedPayload = {
  role: ShareRole;
  project: Project;
};
