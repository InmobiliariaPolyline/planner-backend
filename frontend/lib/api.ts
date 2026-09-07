// Capa de acceso a la API Express. Un único lugar donde vive la URL base y el
// manejo de respuestas. Los mensajes de error son los que ve el usuario.

import type { Milestone, Project, RawTask, ShareLink, ShareRole, SharedPayload, TeamMember } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, init?: RequestInit, failMessage?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json", ...init?.headers } : init?.headers,
    });
  } catch {
    throw new Error("No fue posible conectar con la API");
  }
  if (!response.ok) {
    throw new Error(failMessage ?? "La API respondió con un error");
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  listProjects: () =>
    request<Project[]>("/projects", undefined, "API no disponible"),

  createProject: (data: Record<string, unknown>) =>
    request<Project>("/projects", { method: "POST", body: JSON.stringify(data) }, "No fue posible crear el expediente"),

  updateProject: (id: string, data: Record<string, unknown>) =>
    request<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }, "No fue posible actualizar el expediente"),

  deleteProject: (id: string) =>
    request<void>(`/projects/${id}`, { method: "DELETE" }, "No fue posible eliminar el expediente"),

  listTeamStatuses: () =>
    request<{ id: string; type: string }[]>("/team-statuses", undefined, "No fue posible cargar los estados de equipo"),

  createTeamMember: (projectId: string, data: { name: string; teamStatusId: string }) =>
    request<TeamMember>(`/projects/${projectId}/team-members`, { method: "POST", body: JSON.stringify(data) }, "No fue posible añadir al participante"),

  createMilestone: (projectId: string, data: { description: string; date: string }) =>
    request<Milestone>(`/projects/${projectId}/milestones`, { method: "POST", body: JSON.stringify(data) }, "No fue posible añadir el hito"),

  listTechnicalAreas: () =>
    request<{ id: string }[]>("/technical-areas", undefined, "No fue posible cargar las áreas técnicas"),

  createTask: (projectId: string, data: Record<string, unknown>) =>
    request<RawTask>(`/projects/${projectId}/tasks`, { method: "POST", body: JSON.stringify(data) }, "No fue posible crear la tarea"),

  updateTaskProgress: (taskId: string, progress: number) =>
    request<RawTask>(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ progress }) }, "No fue posible guardar el progreso"),

  // ── Enlaces públicos ────────────────────────────────────────────────────
  listShareLinks: (projectId: string) =>
    request<ShareLink[]>(`/projects/${projectId}/share-links`, undefined, "No fue posible cargar los enlaces"),

  createShareLink: (projectId: string, data: { role: ShareRole; label?: string }) =>
    request<ShareLink>(`/projects/${projectId}/share-links`, { method: "POST", body: JSON.stringify(data) }, "No fue posible crear el enlace"),

  updateShareLink: (id: string, data: { role?: ShareRole; rotate?: boolean; label?: string }) =>
    request<ShareLink>(`/share-links/${id}`, { method: "PATCH", body: JSON.stringify(data) }, "No fue posible actualizar el enlace"),

  deleteShareLink: (id: string) =>
    request<void>(`/share-links/${id}`, { method: "DELETE" }, "No fue posible eliminar el enlace"),

  // Edición mediante enlace de editor
  patchSharedProject: (token: string, data: Record<string, unknown>) =>
    request<Project>(`/shared/${token}`, { method: "PATCH", body: JSON.stringify(data) }, "No fue posible guardar los cambios"),

  patchSharedTaskProgress: (token: string, taskId: string, progress: number) =>
    request<RawTask>(`/shared/${token}/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ progress }) }, "No fue posible guardar el progreso"),
};

/**
 * Resolución del enlace público. Devuelve un resultado discriminado en vez de
 * lanzar, porque el 410 ("enlace rotado o expediente eliminado") es un estado
 * esperado que tiene su propia pantalla.
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
