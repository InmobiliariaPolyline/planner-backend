"use client";

import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { ActiveView } from "@/lib/types";

type Step = { do: string; result?: string };
type Section = {
  id: string;
  icon: IconName;
  title: string;
  intro: string;
  steps: Step[];
  figure?: ReactNode;
  tip?: string;
};

/* — Ilustraciones (mini “capturas” dibujadas con el propio sistema visual) — */

function ShotFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="guide-shot">
      <div className="guide-shot-canvas">{children}</div>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

function FormShot() {
  return (
    <ShotFrame label="Formulario de expediente: los campos obligatorios se marcan en rojo solo al intentar guardar.">
      <div className="guide-mini-form">
        <span className="guide-mini-label">Nombre del proyecto</span>
        <span className="guide-mini-input" />
        <div className="guide-mini-row">
          <span>
            <span className="guide-mini-label">Fecha de inicio</span>
            <span className="guide-mini-input" />
          </span>
          <span>
            <span className="guide-mini-label">Fecha de término</span>
            <span className="guide-mini-input is-bad" />
          </span>
        </div>
        <span className="guide-mini-btn">Crear expediente</span>
      </div>
    </ShotFrame>
  );
}

function GanttShot() {
  return (
    <ShotFrame label="Anatomía del cronograma: cada barra es una tarea; la línea vertical es “hoy”.">
      <svg viewBox="0 0 320 120" className="guide-svg" role="img" aria-label="Diagrama del cronograma Gantt">
        <line x1="8" y1="20" x2="312" y2="20" stroke="var(--border)" />
        {["S1", "S2", "S3", "S4"].map((t, i) => (
          <text key={t} x={20 + i * 76} y="14" className="guide-svg-tick">
            {t}
          </text>
        ))}
        <rect x="8" y="34" width="304" height="20" rx="6" fill="var(--surface-3)" />
        <rect x="24" y="36" width="150" height="16" rx="5" fill="var(--accent)" />
        <rect x="8" y="66" width="304" height="20" rx="6" fill="var(--surface-3)" />
        <rect x="150" y="68" width="120" height="16" rx="5" fill="var(--success)" />
        <line x1="120" y1="28" x2="120" y2="94" stroke="var(--warning)" strokeWidth="2" />
        <circle cx="120" cy="28" r="3" fill="var(--warning)" />
        <text x="126" y="108" className="guide-svg-note">
          hoy
        </text>
        <text x="26" y="102" className="guide-svg-note">
          tarea en curso · tarea completada
        </text>
      </svg>
    </ShotFrame>
  );
}

function ProgressShot() {
  return (
    <ShotFrame label="El progreso de cada tarea se ajusta con el control deslizante; el % del expediente es el promedio.">
      <div className="guide-mini-progress">
        <span className="guide-mini-label">Ajustar progreso — Excavación</span>
        <span className="guide-mini-slider">
          <span className="guide-mini-slider-fill" />
          <span className="guide-mini-slider-knob" />
        </span>
        <span className="guide-mini-hint">45% completado</span>
      </div>
    </ShotFrame>
  );
}

function ShareShot() {
  return (
    <ShotFrame label="Enlace público: elige el permiso, cópialo y compártelo. “Regenerar” invalida el anterior.">
      <div className="guide-mini-share">
        <span className="badge tone-accent">Editor</span>
        <span className="guide-mini-input">https://…/s/9f2c…</span>
        <span className="guide-mini-chip">Copiar</span>
        <span className="guide-mini-chip">Regenerar</span>
      </div>
    </ShotFrame>
  );
}

function CatalogShot() {
  return (
    <ShotFrame label="Catálogos: un área o estado en uso no se puede eliminar (el botón queda desactivado).">
      <div className="guide-mini-catalog">
        <span>
          Obra civil <span className="catalog-inuse">En uso · 2 tareas</span>
        </span>
        <span className="guide-mini-trash is-off">
          <Icon name="trash" size={13} />
        </span>
      </div>
      <div className="guide-mini-catalog">
        <span>Instalaciones</span>
        <span className="guide-mini-trash">
          <Icon name="trash" size={13} />
        </span>
      </div>
    </ShotFrame>
  );
}

const SECTIONS: Section[] = [
  {
    id: "inicio",
    icon: "gauge",
    title: "Primeros pasos",
    intro:
      "Al entrar verás el Dashboard con el resumen de toda la cartera. La barra lateral izquierda es el menú principal.",
    steps: [
      { do: "Pulsa «Acceder al sistema» en la pantalla de inicio.", result: "Entras al Dashboard (sesión de demostración)." },
      { do: "Usa la barra lateral para moverte: Dashboard, Mis expedientes, Catálogos y esta Guía." },
      { do: "Arriba a la derecha tienes la búsqueda, las notificaciones y el cambio de tema claro/oscuro." },
    ],
  },
  {
    id: "crear",
    icon: "folder",
    title: "Crear un expediente",
    intro: "Un expediente es un proyecto de obra: su nombre, responsable, presupuesto y fechas.",
    steps: [
      { do: "Ve a «Mis expedientes» y pulsa «Nuevo expediente»." },
      { do: "Rellena nombre, responsable, presupuesto y las fechas de inicio y término." },
      {
        do: "Pulsa «Crear expediente».",
        result: "El expediente aparece en la lista. La duración en meses se calcula sola.",
      },
    ],
    figure: <FormShot />,
    tip: "Mientras escribes, cada campo muestra una ventana con el ejemplo y los requisitos (obligatorio, máximo de caracteres, formato de fecha…). El borde rojo solo aparece si intentas guardar con algo incompleto.",
  },
  {
    id: "equipo",
    icon: "users",
    title: "Añadir el equipo",
    intro: "Cada expediente tiene participantes, y cada participante un estado (Activo, Inactivo…).",
    steps: [
      { do: "Abre el expediente y, en «Resumen», pulsa «Añadir» en «Participantes»." },
      { do: "Escribe el nombre y elige el estado en la lista." },
      { do: "Si el estado no existe todavía, pulsa «Nuevo» y créalo ahí mismo." },
    ],
  },
  {
    id: "hitos",
    icon: "flag",
    title: "Marcar fechas clave (hitos)",
    intro: "Los hitos son eventos con fecha: entregas, inspecciones, pagos…",
    steps: [
      { do: "En «Resumen» del expediente, pulsa «Añadir» en «Hitos del proyecto»." },
      { do: "Escribe la descripción y la fecha.", result: "El hito queda listado por orden de fecha." },
    ],
  },
  {
    id: "cronograma",
    icon: "calendar",
    title: "Planificar el cronograma",
    intro: "Las tareas viven en la pestaña «Cronograma Gantt» del expediente.",
    steps: [
      { do: "Abre el expediente y entra en «Cronograma Gantt»." },
      { do: "Pulsa «Nueva tarea»: nombre, fechas, responsable y área técnica." },
      {
        do: "Guarda.",
        result: "La tarea aparece como una barra en la línea de tiempo, con la marca de «hoy».",
      },
    ],
    figure: <GanttShot />,
  },
  {
    id: "avance",
    icon: "gauge",
    title: "Actualizar el avance",
    intro: "El progreso se lleva tarea por tarea; el porcentaje del expediente es el promedio.",
    steps: [
      { do: "En el Gantt, pulsa una tarea para abrir su control de progreso." },
      { do: "Arrastra el deslizante y suéltalo.", result: "El avance se guarda y el % del expediente se recalcula." },
    ],
    figure: <ProgressShot />,
  },
  {
    id: "extras",
    icon: "target",
    title: "Métricas y enlaces de una tarea",
    intro: "Dentro de la edición de una tarea puedes registrar su rendimiento y adjuntar enlaces.",
    steps: [
      { do: "En el Gantt, pulsa el lápiz de una tarea para editarla." },
      { do: "En «Métricas de rendimiento» añade unidad, ritmo por día y divisor." },
      { do: "En «Enlaces de Drive» pega una dirección que empiece por http:// o https://." },
    ],
  },
  {
    id: "catalogos",
    icon: "tags",
    title: "Catálogos del sistema",
    intro:
      "Las «áreas técnicas» (para las tareas) y los «estados de equipo» (para los participantes) se administran en «Catálogos».",
    steps: [
      { do: "Ve a «Catálogos» en la barra lateral." },
      { do: "Escribe el nombre y pulsa «Añadir» para crear un elemento." },
      {
        do: "Para borrar, usa la papelera.",
        result: "Si el elemento está en uso, el botón aparece desactivado con la etiqueta «En uso».",
      },
    ],
    figure: <CatalogShot />,
  },
  {
    id: "compartir",
    icon: "link",
    title: "Compartir un expediente",
    intro: "Puedes dar acceso a alguien sin que inicie sesión, mediante un enlace.",
    steps: [
      { do: "Abre el expediente y pulsa «Compartir»." },
      { do: "Elige el permiso: «Solo lectura» o «Editor», y pulsa «Generar enlace»." },
      { do: "Copia el enlace y compártelo. «Regenerar» crea uno nuevo y anula el anterior al instante." },
    ],
    figure: <ShareShot />,
  },
  {
    id: "avisos",
    icon: "bell",
    title: "Notificaciones y tema",
    intro: "La campana guarda un historial de lo que vas haciendo.",
    steps: [
      { do: "Pulsa la campana para ver los avisos." },
      { do: "Usa la «x» de cada aviso para descartarlo, o «Limpiar todo» para vaciar la bandeja." },
      { do: "El icono de sol/luna cambia entre tema claro y oscuro; tu elección se recuerda." },
    ],
  },
];

export function GuideView({ onNavigate }: { onNavigate: (view: ActiveView) => void }) {
  const [active, setActive] = useState(SECTIONS[0].id);

  function go(id: string) {
    setActive(id);
    document.getElementById(`guide-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="view guide">
      <header className="hero">
        <div>
          <p className="eyebrow">Guía de uso</p>
          <h1>Manual del sistema, paso a paso</h1>
          <p className="hero-lead">
            Un recorrido por todo lo que puedes hacer en Project Planner, en el orden en que
            normalmente lo harías. Cada apartado tiene los pasos y una vista de referencia.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => onNavigate("projects")}>
          Ir a Mis expedientes
          <Icon name="arrow-right" size={16} />
        </button>
      </header>

      <nav className="guide-toc" aria-label="Índice de la guía">
        {SECTIONS.map((section, index) => (
          <button
            key={section.id}
            type="button"
            className={active === section.id ? "guide-toc-item is-active" : "guide-toc-item"}
            onClick={() => go(section.id)}
          >
            <span className="guide-toc-num">{index + 1}</span>
            {section.title}
          </button>
        ))}
      </nav>

      <div className="guide-sections">
        {SECTIONS.map((section, index) => (
          <section key={section.id} id={`guide-${section.id}`} className="guide-section panel">
            <div className="guide-section-head">
              <span className="guide-section-num">{index + 1}</span>
              <span className="stat-icon">
                <Icon name={section.icon} size={16} />
              </span>
              <div>
                <h2>{section.title}</h2>
                <p className="hero-lead">{section.intro}</p>
              </div>
            </div>

            <ol className="guide-steps">
              {section.steps.map((step, stepIndex) => (
                <li key={stepIndex}>
                  <span>{step.do}</span>
                  {step.result && (
                    <span className="guide-step-result">
                      <Icon name="arrow-right" size={13} />
                      {step.result}
                    </span>
                  )}
                </li>
              ))}
            </ol>

            {section.figure}

            {section.tip && (
              <p className="guide-tip">
                <Icon name="target" size={14} />
                <span>{section.tip}</span>
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
