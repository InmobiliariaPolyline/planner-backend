"use client";

import { useCallback, useEffect, useState } from "react";
import { api, onUnauthorized, setAuthToken, type SessionUser } from "../lib/api";

const TOKEN_KEY = "project-planner-token";

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function persistToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* almacenamiento no disponible: la sesión no sobrevive a un recargado */
  }
}

export function useAuth() {
  // "checking" evita que se muestre la pantalla de acceso antes de saber si el
  // token guardado sigue siendo válido.
  const [status, setStatus] = useState<"checking" | "in" | "out">(() =>
    readStoredToken() ? "checking" : "out",
  );
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const logout = useCallback(() => {
    setAuthToken(null);
    persistToken(null);
    setUser(null);
    setStatus("out");
  }, []);

  useEffect(() => {
    onUnauthorized(logout);
    return () => onUnauthorized(null);
  }, [logout]);

  useEffect(() => {
    const token = readStoredToken();
    if (!token) return;
    setAuthToken(token);
    api
      .me()
      .then(({ user: sessionUser }) => {
        setUser(sessionUser);
        setStatus("in");
      })
      .catch(() => {
        setAuthToken(null);
        persistToken(null);
        setStatus("out");
      });
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const { token, user: sessionUser } = await api.login(username, password);
      setAuthToken(token);
      persistToken(token);
      setUser(sessionUser);
      setStatus("in");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "No fue posible iniciar sesión");
    } finally {
      setLoginLoading(false);
    }
  }, []);

  return { status, user, login, logout, loginError, loginLoading };
}
