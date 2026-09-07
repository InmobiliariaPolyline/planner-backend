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
  type?: "text" | "number" | "date";
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
  const [focused, setFocused] = useState(false);

  const firstError = fieldError(value, rules);
  const errorVisible = firstError !== null && (touched || showErrors);
  // Mientras el campo tiene el foco: guía completa (ejemplo + requisitos).
  // Al salir con error: solo una línea compacta que no tapa los demás campos.
  const showGuide = focused;
  const showInlineError = errorVisible && !focused;

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
          onChange={(event) => onChange(event.target.value)}
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

      {showInlineError && (
        <p className="vfield-error" id={`${id}-help`}>
          <Icon name="x" size={12} />
          {firstError}
        </p>
      )}
    </div>
  );
}
