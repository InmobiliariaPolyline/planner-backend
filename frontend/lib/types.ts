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
  /** Si el % se calcula solo según las fechas, o quedó fijo tras un ajuste manual. */
  autoProgress: boolean;
  phase: boolean;
  dependency: string;
  technicalArea: string;
  materials: number;
  driveLinks: number;
};

/** Material del catálogo de referencia (GET /materials). */
export type Material = {
  id: string;
  category: string;
  name: string;
  density: number;
  metricLabel: string;
};

/** Un material elegido para una tarea, con un número por cada valor que pide
 * su métrica (p. ej. para "Peso (kg) / Longitud (m)": { "Peso (kg)": 120,
 * "Longitud (m)": 5 }). Cada fila es independiente: dos materiales de la
 * misma categoría no se combinan. */
export type TaskMaterial = {
  id: string;
  values: Record<string, number>;
  material: Material;
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
  taskMaterials?: TaskMaterial[];
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
  teamStatusId: string;
  teamStatus: { type: string };
  userId?: string | null;
  user?: { id: string; name: string; role: string } | null;
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
  logoUrl?: string | null;
  createdById?: string | null;
  createdBy?: { id: string; name: string; role: string } | null;
  tasks?: RawTask[];
  milestones?: Milestone[];
  teamMembers?: TeamMember[];
};

export type ActivityChange = {
  field: string;
  label: string;
  from: string;
  to: string;
  /** Sólo para valores numéricos: si el valor nuevo subió o bajó. */
  dir?: "up" | "down";
};

export type ActivityEvent = {
  id: string;
  createdAt: string;
  actor: string;
  action: string;
  entity: string;
  target: string | null;
  summary: string;
  tone: "neutral" | "positive" | "negative" | "warning";
  changes: ActivityChange[] | null;
};

export type StatusFilter = "all" | "active" | "completed";
export type SortOrder = "recent" | "name" | "progress";
export type GanttMode = "month" | "week";
export type ActiveView =
  | "dashboard"
  | "projects"
  | "overview"
  | "gantt"
  | "activity"
  | "settings"
  | "guide"
  | "users"
  | "config";

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

/** Cuenta mínima, para vincular participantes del equipo (GET /users/basic). */
export type BasicUser = { id: string; name: string; roleLabel: string };

/** Usuario del módulo de Administrador (GET /users). */
export type ManagedUser = {
  id: string;
  username: string;
  name: string;
  role: string;
  roleLabel: string;
  online: boolean;
  createdAt: string;
};

export type UserProjectSummary = {
  id: string;
  name: string;
  progress: number;
  startDate: string;
  endDate: string;
  budget: number;
  isCreator: boolean;
};

export type UserDashboard = {
  user: ManagedUser;
  projects: UserProjectSummary[];
};
