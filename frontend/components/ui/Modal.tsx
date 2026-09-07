"use client";

import type { ReactNode } from "react";
import { Icon } from "./Icon";

// Envoltorio presentacional del modal. El comportamiento de apertura/cierre lo
// controla el componente padre (se cierra con la × o al guardar), igual que antes.
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
  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
          <Icon name="x" size={18} />
        </button>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="modal-title">{title}</h2>
        {description && <p className="modal-description">{description}</p>}
        {children}
      </div>
    </div>
  );
}
