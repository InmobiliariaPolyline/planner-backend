import type { ReactNode } from "react";
import { initials } from "@/lib/format";
import { Icon, type IconName } from "./Icon";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

export function ProgressBar({ value, tone = "accent" }: { value: number; tone?: Tone }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="progress" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <span className={`progress-fill tone-${tone}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`badge tone-${tone}`}>{children}</span>;
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`avatar avatar-${size}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  progress,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: IconName;
  progress?: number;
}) {
  return (
    <article className="stat-card">
      <header>
        <span className="stat-label">{label}</span>
        {icon && (
          <span className="stat-icon">
            <Icon name={icon} size={16} />
          </span>
        )}
      </header>
      <strong className="stat-value">{value}</strong>
      {progress !== undefined && <ProgressBar value={progress} />}
      {hint && <span className="stat-hint">{hint}</span>}
    </article>
  );
}

export function EmptyState({
  icon = "folder",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={22} />
      </span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  count,
  action,
}: {
  eyebrow?: string;
  title: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>
          {title}
          {count !== undefined && <span className="count">{count}</span>}
        </h2>
      </div>
      {action}
    </div>
  );
}
