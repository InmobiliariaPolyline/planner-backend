"use client";

import { useEffect, type ReactNode } from "react";
import { Icon } from "./Icon";

// Envoltorio presentacional del modal: cabecera fija + cuerpo con scroll.
// La apertura/cierre la controla el componente padre (× o al guardar).
export function Modal({
  eyebrow,
  title,
  description,
  onClose,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  // Cerrar con Escape y bloquear el scroll del fondo mientras está abierto.
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

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
          <Icon name="x" size={18} />
        </button>
        <div className="modal-head">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 className="modal-title">{title}</h2>
          {description && <p className="modal-description">{description}</p>}
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
