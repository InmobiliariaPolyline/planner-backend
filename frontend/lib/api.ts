// Capa de acceso a la API Express. Un único lugar donde vive la URL base y el
// manejo de respuestas.

import type {
  ActivityEvent,
  DriveLink,
  Milestone,
  PerformanceMetric,
  Project,
  RawTask,
  ShareLink,
  ShareRole,
  SharedPayload,
  TaskDetail,
  TeamMember,
} from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Reintentos para GET: Render (plan gratuito) duerme y el primer request tras
// inactividad puede tardar. En vez de fallar de una, se reintenta un par de veces.
const RETRY_DELAYS_MS = [2000, 5000, 10000];

/** Se llama cuando un GET tuvo que reintentarse (el servidor está "despertando"). */
let wakingListener: (() => void) | null = null;
export function onServerWaking(listener: (() => void) | null) {
  wakingListener = listener;
}

type Options = RequestInit & { failMessage?: string; retry?: boolean };

async function request<T>(path: string, options: Options = {}): Promise<T> {
  const { failMessage, retry = false, ...init } = options;
  const isRead = !init.method || init.method === "GET";
  const attempts = retry && isRead ? RETRY_DELAYS_MS.length + 1 : 1;

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) {
      wakingListener?.();
      await sleep(RETRY_DELAYS_MS[attempt - 1]);
    }
    let response: Response;
    try {
      response = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: init.body ? { "Content-Type": "application/json", ...init.headers } : init.headers,
      });
    } catch {
      if (attempt < attempts - 1) continue;
      throw new Error("No fue posible conectar con la API");
    }

    // 502/503/504 => el servidor todavía está arrancando; reintentar
    if ([502, 503, 504].includes(response.status) && attempt < attempts - 1) continue;

    if (!response.ok) {
      let serverMessage = "";
      try {
        const body = (await response.json()) as { error?: string };
        if (body?.error && body.error.length < 200 && !body.error.includes("\n")) serverMessage = body.error;
      } catch {
        /* respuesta sin cuerpo JSON */
      }
      throw new Error(serverMessage || failMessage || "La API respondió con un error");
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
  throw new Error(failMessage ?? "La API respondió con un error");
}

const json = (data: unknown) => JSON.stringify(data);

export const api = {
  // Proyectos
  listProjects: () => request<Project[]>("/projects", { failMessage: "API no disponible", retry: true }),
  getProject: (id: string) => request<Project>(`/projects/${id}`, { retry: true }),
  createProject: (data: Record<string, unknown>) =>
    request<Project>("/projects", { method: "POST", body: json(data), failMessage: "No fue posible crear el expediente" }),
  updateProject: (id: string, data: Record<string, unknown>) =>
    request<Project>(`/projects/${id}`, { method: "PATCH", body: json(data), failMessage: "No fue posible actualizar el expediente" }),
  deleteProject: (id: string) =>
    request<void>(`/projects/${id}`, { method: "DELETE", failMessage: "No fue posible eliminar el expediente" }),
  listActivity: (projectId: string) =>
    request<ActivityEvent[]>(`/projects/${projectId}/activity`, {
      retry: true,
      failMessage: "No fue posible cargar el historial",
    }),

  // Catálogos
  listTeamStatuses: () => request<{ id: string; type: string }[]>("/team-statuses", { failMessage: "No fue posible cargar los estados de equipo" }),
  createTeamStatus: (type: string) =>
    request<{ id: string; type: string }>("/team-statuses", { method: "POST", body: json({ type }), failMessage: "No fue posible crear el estado" }),
  deleteTeamStatus: (id: string) =>
    request<void>(`/team-statuses/${id}`, { method: "DELETE", failMessage: "No fue posible eliminar el estado" }),
  listTechnicalAreas: () => request<{ id: string; name: string }[]>("/technical-areas", { failMessage: "No fue posible cargar las áreas técnicas" }),
  createTechnicalArea: (name: string) =>
    request<{ id: string; name: string }>("/technical-areas", { method: "POST", body: json({ name }), failMessage: "No fue posible crear el área" }),
  deleteTechnicalArea: (id: string) =>
    request<void>(`/technical-areas/${id}`, { method: "DELETE", failMessage: "No fue posible eliminar el área" }),

  // Participantes
  createTeamMember: (projectId: string, data: { name: string; teamStatusId: string }) =>
    request<TeamMember>(`/projects/${projectId}/team-members`, { method: "POST", body: json(data), failMessage: "No fue posible añadir al participante" }),
  deleteTeamMember: (id: string) =>
    request<void>(`/team-members/${id}`, { method: "DELETE", failMessage: "No fue posible eliminar al participante" }),

  // Hitos
  createMilestone: (projectId: string, data: { description: string; date: string }) =>
    request<Milestone>(`/projects/${projectId}/milestones`, { method: "POST", body: json(data), failMessage: "No fue posible añadir el hito" }),
  updateMilestone: (id: string, data: { description?: string; date?: string }) =>
    request<Milestone>(`/milestones/${id}`, { method: "PATCH", body: json(data), failMessage: "No fue posible actualizar el hito" }),
  deleteMilestone: (id: string) =>
    request<void>(`/milestones/${id}`, { method: "DELETE", failMessage: "No fue posible eliminar el hito" }),

  // Tareas
  createTask: (projectId: string, data: Record<string, unknown>) =>
    request<RawTask>(`/projects/${projectId}/tasks`, { method: "POST", body: json(data), failMessage: "No fue posible crear la tarea" }),
  updateTask: (taskId: string, data: Record<string, unknown>) =>
    request<RawTask>(`/tasks/${taskId}`, { method: "PATCH", body: json(data), failMessage: "No fue posible guardar la tarea" }),
  updateTaskProgress: (taskId: string, progress: number) =>
    request<RawTask>(`/tasks/${taskId}`, { method: "PATCH", body: json({ progress }), failMessage: "No fue posible guardar el progreso" }),
  deleteTask: (taskId: string) =>
    request<void>(`/tasks/${taskId}`, { method: "DELETE", failMessage: "No fue posible eliminar la tarea" }),

  // Métricas de rendimiento y enlaces de Drive
  createMetric: (taskId: string, data: { unit: string; ratePerDay: number; divisor: number }) =>
    request<PerformanceMetric>(`/tasks/${taskId}/performance-metrics`, { method: "POST", body: json(data), failMessage: "No fue posible crear la métrica" }),
  deleteMetric: (id: string) =>
    request<void>(`/performance-metrics/${id}`, { method: "DELETE", failMessage: "No fue posible eliminar la métrica" }),
  createDriveLink: (taskId: string, url: string) =>
    request<DriveLink>(`/tasks/${taskId}/drive-links`, { method: "POST", body: json({ url }), failMessage: "No fue posible añadir el enlace" }),
  deleteDriveLink: (id: string) =>
    request<void>(`/drive-links/${id}`, { method: "DELETE", failMessage: "No fue posible eliminar el enlace" }),

  // Enlaces públicos (gestión)
  listShareLinks: (projectId: string) =>
    request<ShareLink[]>(`/projects/${projectId}/share-links`, { failMessage: "No fue posible cargar los enlaces" }),
  createShareLink: (projectId: string, data: { role: ShareRole; label?: string }) =>
    request<ShareLink>(`/projects/${projectId}/share-links`, { method: "POST", body: json(data), failMessage: "No fue posible crear el enlace" }),
  updateShareLink: (id: string, data: { role?: ShareRole; rotate?: boolean; label?: string }) =>
    request<ShareLink>(`/share-links/${id}`, { method: "PATCH", body: json(data), failMessage: "No fue posible actualizar el enlace" }),
  deleteShareLink: (id: string) =>
    request<void>(`/share-links/${id}`, { method: "DELETE", failMessage: "No fue posible eliminar el enlace" }),

  // Edición mediante enlace de editor
  patchSharedProject: (token: string, data: Record<string, unknown>) =>
    request<Project>(`/shared/${token}`, { method: "PATCH", body: json(data), failMessage: "No fue posible guardar los cambios" }),
  createSharedTask: (token: string, data: Record<string, unknown>) =>
    request<RawTask>(`/shared/${token}/tasks`, { method: "POST", body: json(data), failMessage: "No fue posible crear la tarea" }),
  patchSharedTask: (token: string, taskId: string, data: Record<string, unknown>) =>
    request<RawTask>(`/shared/${token}/tasks/${taskId}`, { method: "PATCH", body: json(data), failMessage: "No fue posible guardar la tarea" }),
  patchSharedTaskProgress: (token: string, taskId: string, progress: number) =>
    request<RawTask>(`/shared/${token}/tasks/${taskId}`, { method: "PATCH", body: json({ progress }), failMessage: "No fue posible guardar el progreso" }),
  deleteSharedTask: (token: string, taskId: string) =>
    request<void>(`/shared/${token}/tasks/${taskId}`, { method: "DELETE", failMessage: "No fue posible eliminar la tarea" }),
};

/**
 * Resolución del enlace público. Devuelve un resultado discriminado en vez de
 * lanzar: el 410 ("enlace rotado o expediente eliminado") es un estado esperado
 * con su propia pantalla.
 */
export type SharedResult =
  | { status: "ok"; data: SharedPayload }
  | { status: "gone" }
  | { status: "error" };

export async function fetchShared(token: string): Promise<SharedResult> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/shared/${encodeURIComponent(token)}`);
  } catch {
    return { status: "error" };
  }
  if (response.status === 410 || response.status === 404) return { status: "gone" };
  if (!response.ok) return { status: "error" };
  return { status: "ok", data: (await response.json()) as SharedPayload };
}

export type { TaskDetail };
