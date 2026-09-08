"use client";

import { useCallback, useState } from "react";

export type Toast = {
  id: number;
  tone: "success" | "error";
  title: string;
  detail?: string;
};

let seq = 0;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: Toast["tone"], title: string, detail?: string) => {
      const id = ++seq;
      setToasts((current) => [...current.slice(-3), { id, tone, title, detail }]);
      // El éxito se va solo; los errores se quedan hasta que se cierran.
      if (tone === "success") {
        window.setTimeout(() => dismiss(id), 4200);
      }
      return id;
    },
    [dismiss],
  );

  const success = useCallback((title: string, detail?: string) => push("success", title, detail), [push]);
  const error = useCallback((title: string, detail?: string) => push("error", title, detail), [push]);

  return { toasts, success, error, dismiss };
}
