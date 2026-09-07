"use client";

import { useCallback, useState } from "react";
import type { Notification } from "@/lib/types";

const MAX = 8;

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((message: string) => {
    setNotifications((current) =>
      [{ id: Date.now(), message, time: "Ahora" }, ...current].slice(0, MAX),
    );
  }, []);

  const clear = useCallback(() => setNotifications([]), []);

  return { notifications, notify, clear };
}
