"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Primitives";
import { relativeTime } from "@/lib/format";
import type { ActiveView, Notification, Project } from "@/lib/types";
import type { Theme } from "@/hooks/useTheme";
import { UserMenu } from "./UserMenu";

const USER = { name: "Administrador", role: "Sesión de demostración" };

type Crumb = { label: string; onClick?: () => void };

function buildCrumbs(
  activeView: ActiveView,
  selectedProject: Project | null,
  onNavigate: (view: ActiveView) => void,
): Crumb[] {
  if (activeView === "dashboard") return [{ label: "Dashboard" }];
  if (activeView === "settings") return [{ label: "Configuración" }];
  if (activeView === "projects") return [{ label: "Mis expedientes" }];
  const crumbs: Crumb[] = [{ label: "Mis expedientes", onClick: () => onNavigate("projects") }];
  if (selectedProject) {
    crumbs.push({ label: selectedProject.name, onClick: () => onNavigate("overview") });
    crumbs.push({ label: activeView === "gantt" ? "Cronograma" : "Resumen" });
  }
  return crumbs;
}

function NotificationsMenu({
  notifications,
  onClear,
}: {
  notifications: Notification[];
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="notif">
      <button
        type="button"
        className="icon-btn"
        aria-label={`Notificaciones${notifications.length ? ` (${notifications.length})` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="bell" size={18} />
        {notifications.length > 0 && <span className="notif-dot" aria-hidden="true" />}
      </button>
      {open && (
        <div className="notif-panel" role="menu">
          <header>
            <strong>Notificaciones</strong>
            <button type="button" className="link-btn" onClick={onClear}>
              Limpiar
            </button>
          </header>
          {notifications.length ? (
            <ul>
              {notifications.map((item) => (
                <li key={item.id}>
                  <span className="notif-mark" aria-hidden="true" />
                  <div>
                    <p>{item.message}</p>
                    <span>{relativeTime(item.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="notif-empty">No hay actividad reciente.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function AppShell({
  activeView,
  selectedProject,
  theme,
  notifications,
  onNavigate,
  onToggleTheme,
  onClearNotifications,
  onSignOut,
  children,
}: {
  activeView: ActiveView;
  selectedProject: Project | null;
  theme: Theme;
  notifications: Notification[];
  onNavigate: (view: ActiveView) => void;
  onToggleTheme: () => void;
  onClearNotifications: () => void;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const crumbs = buildCrumbs(activeView, selectedProject, onNavigate);
  const navItems: { view: ActiveView; label: string; icon: "dashboard" | "folder" | "settings" }[] = [
    { view: "dashboard", label: "Dashboard", icon: "dashboard" },
    { view: "projects", label: "Mis expedientes", icon: "folder" },
    { view: "settings", label: "Configuración", icon: "settings" },
  ];

  const activeNav: ActiveView =
    activeView === "dashboard" ? "dashboard" : activeView === "settings" ? "settings" : "projects";

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark brand-mark-md" aria-hidden="true">
            <Icon name="target" size={18} />
          </span>
          <div>
            <strong>Project Planner</strong>
            <span>Control de proyectos</span>
          </div>
        </div>

        <p className="sidebar-label">Espacio de trabajo</p>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const active = activeNav === item.view;
            return (
              <button
                key={item.view}
                type="button"
                className={active ? "nav-item is-active" : "nav-item"}
                onClick={() => onNavigate(item.view)}
                title={item.label}
              >
                <Icon name={item.icon} size={18} />
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <span className="user-avatar-wrap">
            <Avatar name={USER.name} size="md" />
            <span className="user-status" aria-hidden="true" />
          </span>
          <div>
            <strong>{USER.name}</strong>
            <span>En línea · demo</span>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <nav className="crumbs" aria-label="Ruta">
            {crumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`}>
                {index > 0 && <span className="crumb-sep" aria-hidden="true">/</span>}
                {crumb.onClick ? (
                  <button type="button" onClick={crumb.onClick}>
                    {crumb.label}
                  </button>
                ) : (
                  <strong>{crumb.label}</strong>
                )}
              </span>
            ))}
          </nav>

          <div className="topbar-actions">
            <button
              type="button"
              className="icon-btn"
              aria-label="Buscar proyectos"
              onClick={() => onNavigate("projects")}
            >
              <Icon name="search" size={18} />
            </button>
            <NotificationsMenu notifications={notifications} onClear={onClearNotifications} />
            <button
              type="button"
              className="icon-btn"
              onClick={onToggleTheme}
              aria-label={`Cambiar a modo ${theme === "light" ? "oscuro" : "claro"}`}
            >
              <Icon name={theme === "light" ? "moon" : "sun"} size={18} />
            </button>
            <UserMenu name={USER.name} role={USER.role} onSignOut={onSignOut} />
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
