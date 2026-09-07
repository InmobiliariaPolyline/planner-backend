"use client";

import { useCallback, useEffect, useState } from "react";
import type { Notification } from "@/lib/types";

const MAX = 12;
const KEY = "project-planner-notifications";

function load(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Notification[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Se carga tras el montaje (no en el render) para no romper la hidratación del
  // SSR: el servidor no tiene localStorage.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotifications(load());
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(notifications));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [notifications]);

  const notify = useCallback((message: string) => {
    setNotifications((current) =>
      [{ id: Date.now(), message, createdAt: Date.now() }, ...current].slice(0, MAX),
    );
  }, []);

  const clear = useCallback(() => setNotifications([]), []);

  return { notifications, notify, clear };
}
