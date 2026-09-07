"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Primitives";
import { api } from "@/lib/api";
import type { ShareLink, ShareRole } from "@/lib/types";

function linkUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/s/${token}`;
}

function LinkRow({
  link,
  onChange,
  onRemove,
}: {
  link: ShareLink;
  onChange: (link: ShareLink) => void;
  onRemove: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = linkUrl(link.token);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* el navegador puede bloquear el portapapeles; el campo sigue siendo seleccionable */
    }
  }

  return (
    <div className="share-row">
      <div className="share-row-top">
        <Badge tone={link.role === "editor" ? "accent" : "neutral"}>
          {link.role === "editor" ? "Editor" : "Solo lectura"}
        </Badge>
        <div className="share-row-actions">
          <select
            value={link.role}
            disabled={busy}
            aria-label="Permiso del enlace"
            onChange={(event) =>
              run(async () => {
                const updated = await api.updateShareLink(link.id, {
                  role: event.target.value as ShareRole,
                });
                onChange(updated);
              })
            }
          >
            <option value="viewer">Solo lectura</option>
            <option value="editor">Editor</option>
          </select>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={busy}
            onClick={() =>
              run(async () => {
                if (
                  !window.confirm(
                    "Se generará un enlace nuevo y el actual dejará de funcionar de inmediato. ¿Continuar?",
                  )
                )
                  return;
                const updated = await api.updateShareLink(link.id, { rotate: true });
                onChange(updated);
              })
            }
          >
            <Icon name="link" size={14} />
            Regenerar
          </button>
          <button
            type="button"
            className="btn btn-ghost-danger btn-sm"
            disabled={busy}
            onClick={() =>
              run(async () => {
                if (!window.confirm("El enlace dejará de funcionar. ¿Eliminarlo?")) return;
                await api.deleteShareLink(link.id);
                onRemove(link.id);
              })
            }
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
      </div>
      <div className="share-url">
        <input readOnly value={url} onFocus={(event) => event.target.select()} />
        <button type="button" className="btn btn-secondary btn-sm" onClick={copy}>
          <Icon name={copied ? "check" : "link"} size={14} />
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

export function ShareManager({
  projectId,
  projectName,
  onClose,
}: {
  projectId: string;
  projectName: string;
  onClose: () => void;
}) {
  const [links, setLinks] = useState<ShareLink[] | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newRole, setNewRole] = useState<ShareRole>("viewer");

  const load = useCallback(() => {
    api
      .listShareLinks(projectId)
      .then(setLinks)
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : "No fue posible cargar los enlaces"),
      );
  }, [projectId]);

  useEffect(load, [load]);

  async function createLink() {
    setCreating(true);
    setError("");
    try {
      const link = await api.createShareLink(projectId, { role: newRole });
      setLinks((current) => [...(current ?? []), link]);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No fue posible crear el enlace");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal
      eyebrow="Compartir expediente"
      title={projectName}
      description="Cualquier persona con el enlace puede abrir este expediente sin iniciar sesión. El enlace no caduca; puedes regenerarlo (lo reemplaza por uno nuevo) o eliminarlo cuando quieras."
      onClose={onClose}
    >
      <div className="share">
        <div className="share-create">
          <label className="select-field">
            <span>Permiso del nuevo enlace</span>
            <select value={newRole} onChange={(event) => setNewRole(event.target.value as ShareRole)}>
              <option value="viewer">Solo lectura</option>
              <option value="editor">Editor</option>
            </select>
          </label>
          <button type="button" className="btn btn-primary" disabled={creating} onClick={createLink}>
            <Icon name="plus" size={15} />
            {creating ? "Generando…" : "Generar enlace"}
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}

        {links === null ? (
          <p className="share-empty">Cargando enlaces…</p>
        ) : links.length === 0 ? (
          <p className="share-empty">Este expediente todavía no tiene enlaces de acceso.</p>
        ) : (
          <div className="share-list">
            {links.map((link) => (
              <LinkRow
                key={link.id}
                link={link}
                onChange={(updated) =>
                  setLinks((current) => (current ?? []).map((item) => (item.id === updated.id ? updated : item)))
                }
                onRemove={(id) => setLinks((current) => (current ?? []).filter((item) => item.id !== id))}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
