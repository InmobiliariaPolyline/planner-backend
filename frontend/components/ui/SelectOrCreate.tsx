"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { fieldError, type Rule } from "./ValidatedField";
import { friendlyError } from "@/lib/errors";

const draftRules: Rule[] = [
  { label: "Obligatorio", test: (v) => v.trim().length > 0 },
  { label: "Máximo 300 caracteres", test: (v) => v.trim().length <= 300 },
  { label: "Sin los símbolos < o >", test: (v) => !/[<>]/.test(v) },
];

/** Select de opciones + posibilidad de crear una nueva ahí mismo. */
export function SelectOrCreate({
  label,
  example,
  options,
  value,
  onChange,
  onCreate,
  placeholderOption = "Selecciona…",
  newPlaceholder = "Nombre",
  required = false,
  showErrors = false,
  placement = "top",
}: {
  label: string;
  /** Ejemplo de valores que se muestra en la ventana de ayuda */
  example?: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  onCreate: (name: string) => Promise<{ id: string; label: string }>;
  placeholderOption?: string;
  newPlaceholder?: string;
  /** Marca el campo como obligatorio: borde rojo y aviso si se envía vacío */
  required?: boolean;
  /** Fuerza mostrar el error aunque no se haya tocado (al enviar el formulario) */
  showErrors?: boolean;
  /** Lado por el que se abre la ventana de ayuda (arriba por defecto) */
  placement?: "top" | "bottom";
}) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  const missing = required && !value && !creating;
  // Solo se marca en rojo tras intentar enviar; abrir el desplegable y cerrarlo
  // sin elegir no marca nada.
  const errorVisible = missing && showErrors;
  const draftProblem = fieldError(draft, draftRules);

  async function create() {
    if (draftProblem) return;
    setBusy(true);
    setError("");
    try {
      const option = await onCreate(draft.trim());
      onChange(option.id);
      setDraft("");
      setCreating(false);
    } catch (createError) {
      setError(friendlyError(createError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`form-row${errorVisible ? " is-invalid" : ""}`}>
      <span>{label}</span>
      {creating ? (
        <div className="inline-create">
          <div className="vfield-control" style={{ flex: 1, minWidth: 0 }}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={newPlaceholder}
              aria-invalid={draftProblem && draft.length > 0 ? true : undefined}
              autoFocus
            />
            {focused && (
              <div className={`vfield-pop place-${placement} align-left`} role="status">
                {example && (
                  <p className="vfield-example">
                    Ejemplo: <span>{example}</span>
                  </p>
                )}
                <ul>
                  {draftRules.map((rule, index) => {
                    const ok = rule.test(draft);
                    return (
                      <li key={index} className={ok ? "ok" : "pending"}>
                        <Icon name={ok ? "check" : "dots"} size={12} />
                        {rule.label}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={create}
            disabled={busy || Boolean(draftProblem)}
          >
            {busy ? "…" : "Crear"}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setCreating(false);
              setError("");
            }}
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div className="inline-create">
          <div className="vfield-control" style={{ flex: 1, minWidth: 0 }}>
            <select
              value={value}
              aria-invalid={errorVisible || undefined}
              onChange={(event) => onChange(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            >
              <option value="">{placeholderOption}</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {focused && (
              <div className={`vfield-pop place-${placement} align-left`} role="status">
                <p className="vfield-example">
                  {options.length
                    ? "Elige una opción de la lista"
                    : "Todavía no hay opciones: pulsa «Nuevo» para crear la primera"}
                  {example && options.length ? (
                    <>
                      {" "}
                      (<span>{example}</span>)
                    </>
                  ) : null}
                </p>
                <ul>
                  <li className={value ? "ok" : "pending"}>
                    <Icon name={value ? "check" : "dots"} size={12} />
                    {required ? "Obligatorio" : "Opcional"}
                  </li>
                  <li className="pending">
                    <Icon name="plus" size={12} />
                    ¿No está en la lista? Pulsa «Nuevo»
                  </li>
                </ul>
              </div>
            )}
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCreating(true)}>
            <Icon name="plus" size={14} />
            Nuevo
          </button>
        </div>
      )}
      {errorVisible && (
        <p className="vfield-error">
          <Icon name="x" size={12} />
          Selecciona una opción o crea una nueva.
        </p>
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
