// Presencia en tiempo real ("en línea" / "desconectado") por WebSocket. Vive
// en memoria del proceso: suficiente para una sola instancia de Render, que es
// como corre hoy este backend.
import type { Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { verifyToken } from './auth';

type PresenceSocket = WebSocket & { userId?: string };

const online = new Map<string, Set<PresenceSocket>>();

// Evita que alguien "parpadee" desconectado al recargar la página: se espera
// un momento antes de avisar, por si vuelve a conectar casi de inmediato.
const OFFLINE_GRACE_MS = 5000;
const pendingOffline = new Map<string, NodeJS.Timeout>();

type Listener = (onlineIds: string[]) => void;
const listeners = new Set<Listener>();

function currentOnlineIds(): string[] {
  return [...online.entries()].filter(([, sockets]) => sockets.size > 0).map(([id]) => id);
}

function broadcastChange() {
  const ids = currentOnlineIds();
  for (const listener of listeners) listener(ids);
  // Todo el que tenga el canal abierto recibe la lista actualizada; solo el
  // panel de Usuarios del Administrador la usa, pero es información inocua
  // (quién está conectado, no qué está haciendo).
  const payload = JSON.stringify({ type: 'presence', online: ids });
  for (const sockets of online.values()) {
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }
}

export function isOnline(userId: string): boolean {
  return (online.get(userId)?.size ?? 0) > 0;
}

export function getOnlineIds(): string[] {
  return currentOnlineIds();
}

/** Se llama con la lista de ids en línea cada vez que cambia. */
export function onPresenceChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function attachPresence(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws/presence' });

  wss.on('connection', (ws: PresenceSocket, req) => {
    const url = new URL(req.url ?? '', 'http://localhost');
    const token = url.searchParams.get('token') ?? '';
    const user = token ? verifyToken(token) : null;
    if (!user) {
      ws.close(4401, 'unauthorized');
      return;
    }
    ws.userId = user.id;

    const pending = pendingOffline.get(user.id);
    if (pending) {
      clearTimeout(pending);
      pendingOffline.delete(user.id);
    }
    if (!online.has(user.id)) online.set(user.id, new Set());
    online.get(user.id)!.add(ws);
    broadcastChange();

    ws.on('close', () => {
      online.get(user.id)?.delete(ws);
      if ((online.get(user.id)?.size ?? 0) > 0) return;
      const timer = setTimeout(() => {
        online.delete(user.id);
        pendingOffline.delete(user.id);
        broadcastChange();
      }, OFFLINE_GRACE_MS);
      pendingOffline.set(user.id, timer);
    });
    ws.on('error', () => ws.close());
  });
}
