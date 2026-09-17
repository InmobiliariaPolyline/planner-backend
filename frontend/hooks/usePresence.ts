"use client";

import { useEffect, useState } from "react";
import { wsUrl } from "@/lib/api";

const RECONNECT_MS = 3000;

/**
 * Mantiene abierto el canal de presencia mientras haya sesión, y devuelve el
 * conjunto de ids de usuario actualmente en línea (se actualiza en vivo).
 */
export function usePresence(token: string | null) {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  // Antes del primer mensaje no sabemos quién está en línea todavía: evita
  // mostrar a todos como "desconectado" mientras el canal termina de abrir.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!token) return;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      socket = new WebSocket(wsUrl(`/ws/presence?token=${encodeURIComponent(token)}`));
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === "presence" && Array.isArray(data.online)) {
            setOnlineIds(new Set(data.online));
            setReady(true);
          }
        } catch {
          /* mensaje no reconocido: se ignora */
        }
      };
      socket.onclose = () => {
        if (stopped) return;
        setReady(false);
        reconnectTimer = window.setTimeout(connect, RECONNECT_MS);
      };
      socket.onerror = () => socket?.close();
    };
    connect();

    return () => {
      stopped = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
      setOnlineIds(new Set());
      setReady(false);
    };
  }, [token]);

  return { onlineIds, ready };
}
