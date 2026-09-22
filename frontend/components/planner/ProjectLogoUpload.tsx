"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { friendlyError } from "@/lib/errors";

const MIN_SIZE = 150;
const MAX_SIZE = 250;
const MAX_BYTES = 1_500_000;

function readImage(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const img = new Image();
      img.onerror = () => reject(new Error("El archivo no es una imagen válida."));
      img.onload = () => resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/** Logotipo del expediente: opcional, editable en cualquier momento. */
export function ProjectLogoUpload({
  logoUrl,
  onChange,
}: {
  logoUrl?: string | null;
  onChange: (dataUrl: string | null) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Elige un archivo de imagen (PNG, JPG o similar).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("La imagen pesa demasiado (máximo ~1.5 MB).");
      return;
    }
    setBusy(true);
    try {
      const { dataUrl, width, height } = await readImage(file);
      if (width < MIN_SIZE || height < MIN_SIZE || width > MAX_SIZE || height > MAX_SIZE) {
        setError(
          `La imagen mide ${width}×${height}px. Debe medir entre ${MIN_SIZE}×${MIN_SIZE} y ${MAX_SIZE}×${MAX_SIZE} px.`,
        );
        return;
      }
      await onChange(dataUrl);
    } catch (uploadError) {
      setError(friendlyError(uploadError));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setError("");
    setBusy(true);
    try {
      await onChange(null);
    } catch (removeError) {
      setError(friendlyError(removeError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="project-logo">
      <button
        type="button"
        className="project-logo-frame"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={logoUrl ? "Cambiar el logotipo del expediente" : "Subir un logotipo para el expediente"}
        title={logoUrl ? "Cambiar el logotipo" : `Subir un logotipo (${MIN_SIZE}×${MIN_SIZE} a ${MAX_SIZE}×${MAX_SIZE} px, opcional)`}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logotipo del expediente" />
        ) : (
          <Icon name="folder" size={20} />
        )}
        <span className="project-logo-edit" aria-hidden="true">
          <Icon name="plus" size={12} />
        </span>
      </button>
      {logoUrl && (
        <button type="button" className="project-logo-remove" onClick={handleRemove} disabled={busy}>
          Quitar
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(event) => handleFile(event.target.files?.[0])} />
      {error && <p className="form-error project-logo-error">{error}</p>}
    </div>
  );
}
