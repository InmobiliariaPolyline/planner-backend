"use client";

import { useId, useState } from "react";
import { Icon } from "./Icon";

export type Rule = {
  /** Texto que se muestra en la lista de requisitos */
  label: string;
  /** Devuelve true si el valor cumple el requisito */
  test: (value: string) => boolean;
};

export function fieldError(value: string, rules: Rule[]): string | null {
  const failing = rules.find((rule) => !rule.test(value));
  return failing ? failing.label : null;
}

export function ValidatedField({
  label,
  example,
  rules,
  value,
  onChange,
  type = "text",
  inputMode,
  min,
  step,
  placeholder,
  showErrors = false,
  placement = "bottom",
  align = "left",
}: {
  label: string;
  example: string;
  rules: Rule[];
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date" | "url";
  inputMode?: "numeric" | "decimal";
  min?: string;
  step?: string;
  placeholder?: string;
  /** Fuerza mostrar el error aunque el campo no se haya tocado (p. ej. al enviar) */
  showErrors?: boolean;
  placement?: "top" | "bottom";
  align?: "left" | "right";
}) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [focused, setFocused] = useState(false);

  const firstError = fieldError(value, rules);

  // El borde rojo y el aviso bajo el campo solo aparecen si:
  //  (a) se intentó enviar el formulario (showErrors), o
  //  (b) el usuario escribió algo, lo dejó inválido y salió del campo.
  // Entrar y salir sin escribir nada, o dejarlo a medias, no marca nada.
  const blurredWithContent = touched && dirty && value.trim() !== "";
  const errorVisible = firstError !== null && (showErrors || blurredWithContent);

  // Mientras el campo tiene el foco: guía completa (ejemplo + requisitos en vivo).
  // Al salir con error: solo una línea compacta que no tapa los demás campos.
  const showGuide = focused;
  const showInlineError = errorVisible && !focused;
  // Los requisitos sin cumplir se pintan en rojo en cuanto el usuario empieza a
  // escribir (o tras intentar enviar); antes de escribir, en gris neutro.
  const flagUnmet = dirty || showErrors;

  return (
    <div className={`vfield${errorVisible ? " is-invalid" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <div className="vfield-control">
        <input
          id={id}
          type={type}
          value={value}
          inputMode={inputMode}
          min={min}
          step={step}
          placeholder={placeholder}
          aria-invalid={errorVisible || undefined}
          aria-describedby={showGuide || showInlineError ? `${id}-help` : undefined}
          onChange={(event) => {
            setDirty(true);
            onChange(event.target.value);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setTouched(true);
          }}
        />
        {errorVisible && (
          <span className="vfield-flag" aria-hidden="true">
            <Icon name="x" size={13} />
          </span>
        )}

        {showGuide && (
          <div
            className={`vfield-pop place-${placement} align-${align}`}
            id={`${id}-help`}
            role="status"
          >
            <p className="vfield-example">
              Ejemplo: <span>{example}</span>
            </p>
            <ul>
              {rules.map((rule, index) => {
                const ok = rule.test(value);
                const state = ok ? "ok" : flagUnmet ? "bad" : "pending";
                return (
                  <li key={index} className={state}>
                    <Icon name={ok ? "check" : state === "bad" ? "x" : "dots"} size={12} />
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {showInlineError && (
        <p className="vfield-error" id={`${id}-help`}>
          <Icon name="x" size={12} />
          {firstError}
        </p>
      )}
    </div>
  );
}
