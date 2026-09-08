"use client";

import { Icon } from "./Icon";
import type { Toast } from "@/hooks/useToasts";

export function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (!toasts.length) return null;
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          <span className="toast-icon" aria-hidden="true">
            <Icon name={toast.tone === "success" ? "check" : "x"} size={15} />
          </span>
          <div className="toast-body">
            <strong>{toast.title}</strong>
            {toast.detail && <span>{toast.detail}</span>}
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Cerrar aviso"
          >
            <Icon name="x" size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
