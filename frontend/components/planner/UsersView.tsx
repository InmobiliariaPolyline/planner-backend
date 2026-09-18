"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/Primitives";
import { Modal } from "@/components/ui/Modal";
import { friendlyError } from "@/lib/errors";
import { api } from "@/lib/api";
import type { ManagedUser, UserDashboard } from "@/lib/types";

function money(value: number): string {
  return value.toLocaleString("es", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function StatusBadge({ online }: { online: boolean }) {
  return (
    <span
      style={{
        flexShrink: 0,
        padding: "2px var(--space-2)",
        borderRadius: "var(--radius-pill)",
        fontSize: "var(--text-xs)",
        fontWeight: 600,
        background: online ? "var(--success-subtle)" : "var(--surface-3)",
        color: online ? "var(--success-on-subtle)" : "var(--text-secondary)",
      }}
    >
      {online ? "En línea" : "Desconectado"}
    </span>
  );
}

function UserDashboardModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [data, setData] = useState<UserDashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .getUserDashboard(userId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((fetchError) => {
        if (!cancelled) setError(friendlyError(fetchError));
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <Modal
      eyebrow="Usuarios"
      title={data ? data.user.name : "Cargando…"}
      description={data ? `${data.user.roleLabel} · ${data.user.online ? "En línea ahora" : "Desconectado"}` : undefined}
      onClose={onClose}
    >
      {error && <p className="form-error">{error}</p>}
      {!data && !error && <p className="hero-lead">Cargando panel…</p>}
      {data && (
        <div className="form">
          <p className="hero-lead">
            {data.projects.length
              ? `Tiene acceso a ${data.projects.length} expediente${data.projects.length === 1 ? "" : "s"}.`
              : "Todavía no tiene expedientes creados ni asignados."}
          </p>
          {data.projects.length > 0 && (
            <ul className="catalog-list">
              {data.projects.map((project) => (
                <li key={project.id}>
                  <span>
                    {project.name}
                    {project.isCreator && <span className="catalog-inuse"> · Creador</span>}
                  </span>
                  <span className="catalog-inuse">
                    {project.progress}% · {money(project.budget)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}

export function UsersView({
  onlineIds,
  presenceReady,
  currentUserId,
}: {
  onlineIds: Set<string>;
  presenceReady: boolean;
  /** El propio usuario no abre su panel: ya está viendo su sesión. */
  currentUserId: string;
}) {
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [error, setError] = useState("");
  const [openUserId, setOpenUserId] = useState<string | null>(null);

  useEffect(() => {
    api
      .listUsers()
      .then(setUsers)
      .catch((fetchError) => setError(friendlyError(fetchError)));
  }, []);

  return (
    <div className="view settings">
      <header className="hero">
        <div>
          <p className="eyebrow">Administración</p>
          <h1>Usuarios</h1>
          <p className="hero-lead">
            Todas las cuentas del sistema. Haz clic en una para ver sus expedientes.
          </p>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      {users === null && !error && <p className="hero-lead">Cargando usuarios…</p>}

      {users && users.length === 0 && (
        <EmptyState icon="users" title="Sin usuarios" description="Todavía no hay cuentas creadas." />
      )}

      {users && users.length > 0 && (
        <section className="panel">
          <ul className="catalog-list">
            {users.map((user) => {
              const online = presenceReady ? onlineIds.has(user.id) : user.online;
              const isSelf = user.id === currentUserId;
              const dot = (
                <span
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: online ? "var(--success)" : "var(--text-muted)",
                    flexShrink: 0,
                  }}
                />
              );
              const label = (
                <span>
                  <strong>{user.name}</strong> · {user.roleLabel}
                </span>
              );
              return (
                <li key={user.id}>
                  {isSelf ? (
                    <span style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flex: 1, minWidth: 0 }}>
                      {dot}
                      {label}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOpenUserId(user.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-3)",
                        flex: 1,
                        minWidth: 0,
                        textAlign: "left",
                        border: "none",
                        background: "none",
                        padding: 0,
                        font: "inherit",
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      {dot}
                      {label}
                    </button>
                  )}
                  <span className="hero-lead" style={{ flexShrink: 0 }}>
                    {user.username}
                    {isSelf ? " · Tú" : ""}
                  </span>
                  <StatusBadge online={online} />
                  {!isSelf && <Icon name="arrow-right" size={14} />}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {openUserId && <UserDashboardModal userId={openUserId} onClose={() => setOpenUserId(null)} />}
    </div>
  );
}
