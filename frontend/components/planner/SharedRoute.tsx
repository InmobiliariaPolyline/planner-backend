"use client";

import { useEffect, useState } from "react";
import { fetchShared, type SharedResult } from "@/lib/api";
import { ExpedienteUnavailable } from "./ExpedienteUnavailable";
import { LoadingScreen } from "./Screens";
import { SharedExpediente } from "./SharedExpediente";

export function SharedRoute({ token }: { token: string }) {
  const [result, setResult] = useState<SharedResult | null>(null);

  useEffect(() => {
    let active = true;
    fetchShared(token).then((value) => {
      if (active) setResult(value);
    });
    return () => {
      active = false;
    };
  }, [token]);

  if (!result) return <LoadingScreen />;
  if (result.status === "ok") return <SharedExpediente token={token} payload={result.data} />;
  if (result.status === "gone") return <ExpedienteUnavailable />;

  return (
    <main className="unavailable">
      <div className="unavailable-card">
        <p className="eyebrow">Sin conexión</p>
        <h1>No fue posible cargar el expediente</h1>
        <p className="unavailable-lead">
          Revisa tu conexión e inténtalo de nuevo. Si el problema continúa, comunícate con el
          proveedor.
        </p>
      </div>
    </main>
  );
}
