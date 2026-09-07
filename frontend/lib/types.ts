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
  time: string;
};

export type ProjectFormValues = {
  name: string;
  startDate: string;
  endDate: string;
  durationMonths: string;
  ownerName: string;
  budget: string;
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
