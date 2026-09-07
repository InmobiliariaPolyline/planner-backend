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

/* — Figuras de referencia (dibujadas con el propio sistema visual) — */

function Shot({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="guide-shot">
      <div className="guide-shot-bar" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="guide-shot-body">{children}</div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function FormShot() {
  return (
    <Shot caption="Al guardar, los campos sin completar se marcan en rojo; mientras escribes solo ves la ayuda.">
      <div className="gs-form">
        <label>
          Nombre del proyecto
          <span className="gs-input has-text">Ampliación planta norte</span>
        </label>
        <div className="gs-form-two">
          <label>
            Fecha de inicio
            <span className="gs-input has-text">2026-03-01</span>
          </label>
          <label>
            Fecha de término
            <span className="gs-input is-bad" />
            <span className="gs-input-error">Obligatorio</span>
          </label>
        </div>
        <span className="gs-btn">Crear expediente</span>
      </div>
    </Shot>
  );
}

function GanttShot() {
  return (
    <Shot caption="Cada barra es una tarea a lo largo del tiempo. La línea amarilla marca el día de hoy.">
      <div className="gs-gantt">
        <div className="gs-gantt-today" style={{ left: "46%" }}>
          <span>Hoy</span>
        </div>
        <div className="gs-gantt-row">
          <span className="gs-gantt-name">Excavación</span>
          <span className="gs-gantt-track">
            <span className="gs-bar is-progress" style={{ left: "6%", width: "44%" }} />
          </span>
        </div>
        <div className="gs-gantt-row">
          <span className="gs-gantt-name">Cimentación</span>
          <span className="gs-gantt-track">
            <span className="gs-bar is-done" style={{ left: "40%", width: "38%" }} />
          </span>
        </div>
        <div className="gs-gantt-row">
          <span className="gs-gantt-name">Estructura</span>
          <span className="gs-gantt-track">
            <span className="gs-bar" style={{ left: "70%", width: "26%" }} />
          </span>
        </div>
      </div>
      <div className="gs-legend">
        <span>
          <i className="is-progress" /> En curso
        </span>
        <span>
          <i className="is-done" /> Completada
        </span>
        <span>
          <i className="is-planned" /> Planificada
        </span>
        <span>
          <i className="is-today" /> Hoy
        </span>
      </div>
    </Shot>
  );
}

function ProgressShot() {
  return (
    <Shot caption="El deslizante fija el avance de la tarea; el % del expediente es el promedio de sus tareas.">
      <div className="gs-progress">
        <div className="gs-progress-head">
          <span>Progreso de «Excavación»</span>
          <strong>45%</strong>
        </div>
        <span className="gs-progress-track">
          <span className="gs-progress-fill" style={{ width: "45%" }} />
          <span className="gs-progress-knob" style={{ left: "45%" }} />
        </span>
        <p className="gs-progress-note">Arrastra y suelta: el avance se guarda al soltar.</p>
      </div>
    </Shot>
  );
}

function ShareShot() {
  return (
    <Shot caption="Genera un enlace con permiso de lectura o de edición. «Regenerar» anula el anterior al instante.">
      <div className="gs-share">
        <div className="gs-share-row">
          <span className="badge tone-accent">Editor</span>
          <span className="gs-input has-text is-mono">https://…/s/9f2c8a1b</span>
        </div>
        <div className="gs-share-actions">
          <span className="gs-chip">
            <Icon name="link" size={13} /> Copiar
          </span>
          <span className="gs-chip">
            <Icon name="link" size={13} /> Regenerar
          </span>
        </div>
      </div>
    </Shot>
  );
}

function CatalogShot() {
  return (
    <Shot caption="Un área o estado en uso no se puede borrar: el botón queda desactivado y avisa de cuántos lo usan.">
      <div className="gs-catalog">
        <div className="gs-catalog-row">
          <span>Obra civil</span>
          <span className="catalog-inuse">En uso · 2 tareas</span>
          <span className="gs-trash is-off">
            <Icon name="trash" size={13} />
          </span>
        </div>
        <div className="gs-catalog-row">
          <span>Instalaciones</span>
          <span className="gs-trash">
            <Icon name="trash" size={13} />
          </span>
        </div>
      </div>
    </Shot>
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
      {
        do: "Pulsa «Acceder al sistema» en la pantalla de inicio.",
        result: "Entras al Dashboard (sesión de demostración).",
      },
      { do: "Usa la barra lateral para moverte: Dashboard, Mis expedientes, Catálogos y esta Guía." },
      {
        do: "Arriba a la derecha tienes la búsqueda, las notificaciones y el cambio de tema claro/oscuro.",
      },
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
        result: "Aparece en la lista. La duración en meses se calcula sola.",
      },
    ],
    figure: <FormShot />,
    tip: "Al enfocar un campo aparece una ventana con un ejemplo y los requisitos, que se marcan en verde según los cumples. El borde rojo solo sale si intentas guardar con algo incompleto.",
  },
  {
    id: "equipo",
    icon: "users",
    title: "Añadir el equipo",
    intro: "Cada expediente tiene participantes, y cada participante un estado (Activo, Inactivo…).",
    steps: [
      { do: "Abre el expediente y, en «Resumen», pulsa «Añadir» en «Participantes»." },
      { do: "Escribe el nombre y elige el estado en la lista." },
      {
        do: "¿El estado no existe todavía? Pulsa «Nuevo» y créalo sin salir del formulario.",
      },
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
      {
        do: "Arrastra el deslizante y suéltalo.",
        result: "El avance se guarda y el % del expediente se recalcula.",
      },
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
      "Las «áreas técnicas» (para las tareas) y los «estados de equipo» (para los participantes) se administran aquí.",
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
      {
        do: "Copia el enlace y compártelo.",
        result: "«Regenerar» crea uno nuevo y anula el anterior de inmediato.",
      },
    ],
    figure: <ShareShot />,
  },
  {
    id: "avisos",
    icon: "bell",
    title: "Notificaciones y tema",
    intro: "La campana guarda un historial de lo que vas haciendo en el sistema.",
    steps: [
      { do: "Pulsa la campana para ver los avisos." },
      { do: "Usa la «x» de un aviso para descartarlo, o «Limpiar todo» para vaciar la bandeja." },
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
            normalmente lo harías. Cada apartado tiene sus pasos y una figura de referencia.
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
              <span className="guide-section-icon">
                <Icon name={section.icon} size={17} />
              </span>
              <div>
                <h2>{section.title}</h2>
                <p>{section.intro}</p>
              </div>
            </div>

            <div className={section.figure ? "guide-section-body has-figure" : "guide-section-body"}>
              <ol className="guide-steps">
                {section.steps.map((step, stepIndex) => (
                  <li key={stepIndex}>
                    <span className="guide-step-do">{step.do}</span>
                    {step.result && (
                      <span className="guide-step-result">
                        <Icon name="check" size={13} />
                        {step.result}
                      </span>
                    )}
                  </li>
                ))}
              </ol>

              {section.figure && (
                <div className="guide-figure-col">
                  {section.figure}
                  {section.tip && (
                    <p className="guide-tip">
                      <Icon name="target" size={14} />
                      <span>{section.tip}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {!section.figure && section.tip && (
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
