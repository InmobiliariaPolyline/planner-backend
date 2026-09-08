"use client";

import { useState } from "react";
import { friendlyError } from "@/lib/errors";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmar",
  tone = "danger",
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: "danger" | "accent";
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (runError) {
      setError(friendlyError(runError));
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p className="confirm-message">{message}</p>
      {error && <p className="form-error">{error}</p>}
      <div className="confirm-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
          Cancelar
        </button>
        <button
          type="button"
          className={tone === "danger" ? "btn btn-ghost-danger" : "btn btn-primary"}
          onClick={run}
          disabled={busy}
        >
          {tone === "danger" && <Icon name="trash" size={15} />}
          {busy ? "…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
