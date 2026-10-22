"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { ActiveView, Project } from "@/lib/types";

type Result = {
  key: string;
  group: "Módulos" | "Expedientes" | "Tareas";
  icon: IconName;
  title: string;
  hint: string;
  run: () => void;
};

const fold = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Búsqueda global (Ctrl+K): módulos, expedientes y tareas. */
export function SearchPalette({
  projects,
  isAdmin,
  onNavigate,
  onSelectProject,
  onClose,
}: {
  projects: Project[];
  isAdmin: boolean;
  onNavigate: (view: ActiveView) => void;
  onSelectProject: (project: Project) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const all = useMemo<Result[]>(() => {
    const go = (view: ActiveView) => () => {
      onNavigate(view);
      onClose();
    };
    const modules: Result[] = [
      { key: "m-dashboard", group: "Módulos", icon: "dashboard", title: "Dashboard", hint: "Resumen general", run: go("dashboard") },
      { key: "m-projects", group: "Módulos", icon: "folder", title: "Mis expedientes", hint: "Lista de proyectos", run: go("projects") },
      { key: "m-catalogs", group: "Módulos", icon: "tags", title: "Catálogos", hint: "Áreas técnicas y estados de equipo", run: go("settings") },
      ...(isAdmin
        ? [{ key: "m-users", group: "Módulos" as const, icon: "users" as IconName, title: "Usuarios", hint: "Cuentas del sistema", run: go("users") }]
        : []),
      { key: "m-guide", group: "Módulos", icon: "book", title: "Guía de uso", hint: "Manual paso a paso", run: go("guide") },
      { key: "m-system", group: "Módulos", icon: "settings", title: "Sistema", hint: "Perfil, apariencia, seguridad", run: go("system") },
    ];
    const open = (project: Project) => () => {
      onSelectProject(project);
      onClose();
    };
    const projectResults: Result[] = projects.map((project) => ({
      key: `p-${project.id}`,
      group: "Expedientes",
      icon: "folder",
      title: project.name,
      hint: `Responsable: ${project.ownerName}`,
      run: open(project),
    }));
    const taskResults: Result[] = projects.flatMap((project) =>
      ((project.tasks ?? []) as Record<string, unknown>[]).map((task) => ({
        key: `t-${String(task.id)}`,
        group: "Tareas" as const,
        icon: "check-circle" as IconName,
        title: String(task.name ?? ""),
        hint: `${project.name} · ${String(task.ownerName ?? "")}`,
        run: open(project),
      })),
    );
    return [...modules, ...projectResults, ...taskResults];
  }, [projects, isAdmin, onNavigate, onClose, onSelectProject]);

  const results = useMemo(() => {
    const q = fold(query);
    if (!q) return all.filter((r) => r.group === "Módulos" || r.group === "Expedientes").slice(0, 12);
    // Prioridad: el título empieza con la búsqueda > la contiene > solo coincide la descripción.
    const score = (r: Result) => {
      const title = fold(r.title);
      return title.startsWith(q) ? 0 : title.includes(q) ? 1 : 2;
    };
    return all
      .filter((r) => fold(`${r.title} ${r.hint}`).includes(q))
      .map((r, order) => ({ r, order, s: score(r) }))
      .sort((a, b) => a.s - b.s || a.order - b.order)
      .map(({ r }) => r)
      .slice(0, 30);
  }, [all, query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [cursor, results]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      results[cursor]?.run();
    }
  }

  return (
    <div
      className="modal-backdrop palette-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="palette" role="dialog" aria-modal="true" aria-label="Búsqueda global">
        <div className="palette-input">
          <Icon name="search" size={18} />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Buscar módulos, expedientes y tareas…"
            aria-label="Buscar"
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="palette-list" ref={listRef} role="listbox">
          {results.length === 0 && <li className="palette-empty">Sin resultados para «{query}».</li>}
          {results.map((result, index) => {
            const header = index === 0 || results[index - 1].group !== result.group;
            return (
              <li key={result.key} role="presentation">
                {header && <p className="palette-group">{result.group}</p>}
                <button
                  type="button"
                  role="option"
                  aria-selected={index === cursor}
                  className={index === cursor ? "palette-item is-active" : "palette-item"}
                  onMouseEnter={() => setCursor(index)}
                  onClick={result.run}
                >
                  <span className="palette-icon">
                    <Icon name={result.icon} size={16} />
                  </span>
                  <span className="palette-text">
                    <strong>{result.title}</strong>
                    <small>{result.hint}</small>
                  </span>
                  {index === cursor && <Icon name="arrow-right" size={15} />}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="palette-foot">
          <kbd>↑</kbd> <kbd>↓</kbd> navegar · <kbd>Enter</kbd> abrir · <kbd>Ctrl</kbd> <kbd>K</kbd> abrir búsqueda
        </p>
      </div>
    </div>
  );
}
