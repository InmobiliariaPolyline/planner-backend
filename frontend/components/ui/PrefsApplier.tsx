"use client";

import { useEffect } from "react";
import { applyPreferences, usePreferences } from "@/lib/preferences";

/** Aplica las preferencias guardadas (acento, esquinas, densidad…) en cada pantalla,
 * incluido el login. El módulo «Sistema» las cambia con setPreferences. */
export function PrefsApplier() {
  const prefs = usePreferences();
  useEffect(() => {
    applyPreferences(prefs);
  }, [prefs]);
  return null;
}
