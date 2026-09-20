"use client";

import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const Tag = as;
  return (
    <Tag
      className={`rounded-card border border-sand bg-white/80 p-4 shadow-[0_2px_10px_-6px_rgba(90,74,52,0.25)] ${className}`}
    >
      {children}
    </Tag>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
  testId,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  testId?: string;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`cta w-full px-5 text-[15px] text-white ${
        disabled
          ? "bg-ink-faint/40 cursor-not-allowed"
          : "bg-leaf-deep hover:brightness-105 active:brightness-95"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  testId,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  testId?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`cta w-full border border-sand bg-white/70 px-5 text-[15px] text-ink-soft hover:bg-white ${className}`}
    >
      {children}
    </button>
  );
}

/** Rounded energy bar. Purely a helper for the number, never the headline (P1). */
export function ProgressBar({
  value,
  max,
  label,
  testId,
}: {
  value: number;
  max: number;
  label?: string;
  testId?: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      className="h-3 w-full overflow-hidden rounded-full bg-sand"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      data-testid={testId}
    >
      <div
        className="h-full rounded-full bg-growth transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[12px] font-semibold tracking-wide text-ink-faint">
      {children}
    </p>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between px-5 pt-6 pb-3">
      <div>
        <h1 className="text-[20px] font-bold text-ink">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-[13px] text-ink-soft">{subtitle}</p> : null}
      </div>
      {right}
    </header>
  );
}
