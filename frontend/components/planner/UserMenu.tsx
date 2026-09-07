"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Primitives";

export function UserMenu({
  name,
  role,
  onSignOut,
}: {
  name: string;
  role: string;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-chip"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="user-avatar-wrap">
          <Avatar name={name} size="sm" />
          <span className="user-status" aria-hidden="true" />
        </span>
        <span className="user-chip-text">
          <strong>{name}</strong>
          <span>{role}</span>
        </span>
        <Icon name="chevron-down" size={14} />
      </button>

      {open && (
        <div className="user-pop" role="menu">
          <div className="user-pop-head">
            <Avatar name={name} size="md" />
            <div>
              <strong>{name}</strong>
              <span>{role}</span>
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            className="user-pop-item"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            <Icon name="logout" size={15} />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
