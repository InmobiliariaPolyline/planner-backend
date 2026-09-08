"use client";

import { useRef, type ReactNode } from "react";

/** Botón que abre el selector de archivos y entrega el archivo elegido. */
export function FilePicker({
  accept,
  onPick,
  className = "btn btn-secondary btn-sm",
  children,
}: {
  accept: string;
  onPick: (file: File) => void;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className={className} onClick={() => ref.current?.click()}>
        {children}
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
    </>
  );
}
