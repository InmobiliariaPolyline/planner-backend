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

export type TwoFactorChallenge = { challengeId: string; cooldownSeconds: number; emailHint: string };

export function useAuth() {
  // "checking" evita que se muestre la pantalla de acceso antes de saber si el
  // token guardado sigue siendo válido.
  const [status, setStatus] = useState<"checking" | "in" | "out">(() =>
    readStoredToken() ? "checking" : "out",
  );
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  // Presente solo mientras se espera el código del segundo paso (verificación
  // en dos pasos). Con esto en null, la pantalla de acceso muestra el
  // formulario normal de usuario/contraseña.
  const [twoFactor, setTwoFactor] = useState<TwoFactorChallenge | null>(null);

  const logout = useCallback(() => {
    setAuthToken(null);
    persistToken(null);
    setUser(null);
    setToken(null);
    setTwoFactor(null);
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
        setToken(token);
        setStatus("in");
      })
      .catch(() => {
        setAuthToken(null);
        persistToken(null);
        setStatus("out");
      });
  }, []);

  function completeLogin(newToken: string, sessionUser: SessionUser) {
    setAuthToken(newToken);
    persistToken(newToken);
    setUser(sessionUser);
    setToken(newToken);
    setTwoFactor(null);
    setStatus("in");
  }

  const login = useCallback(async (username: string, password: string) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const result = await api.login(username, password);
      if (result.twoFactorRequired) {
        setTwoFactor({ challengeId: result.challengeId, cooldownSeconds: result.cooldownSeconds, emailHint: result.emailHint });
        return;
      }
      completeLogin(result.token, result.user);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "No fue posible iniciar sesión");
    } finally {
      setLoginLoading(false);
    }
  }, []);

  const verifyTwoFactor = useCallback(
    async (code: string) => {
      if (!twoFactor) return;
      setLoginLoading(true);
      setLoginError(null);
      try {
        const { token: newToken, user: sessionUser } = await api.verifyLoginCode(twoFactor.challengeId, code);
        completeLogin(newToken, sessionUser);
      } catch (error) {
        setLoginError(error instanceof Error ? error.message : "No fue posible verificar el código");
      } finally {
        setLoginLoading(false);
      }
    },
    [twoFactor],
  );

  const resendTwoFactor = useCallback(async () => {
    if (!twoFactor) return;
    setLoginError(null);
    try {
      const { challengeId, cooldownSeconds } = await api.resendLoginCode(twoFactor.challengeId);
      setTwoFactor((current) => (current ? { ...current, challengeId, cooldownSeconds } : current));
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "No fue posible reenviar el código");
    }
  }, [twoFactor]);

  const cancelTwoFactor = useCallback(() => {
    setTwoFactor(null);
    setLoginError(null);
  }, []);

  return {
    status,
    user,
    token,
    login,
    logout,
    loginError,
    loginLoading,
    twoFactor,
    verifyTwoFactor,
    resendTwoFactor,
    cancelTwoFactor,
  };
}
