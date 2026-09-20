"use client";

import type { ReactNode } from "react";

/* ------------------------------------------------------------------ surfaces */

export function Card({
  children,
  className = "",
  variant = "default",
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "warm" | "hero";
  as?: "div" | "section" | "li";
}) {
  const Tag = as;
  const base =
    variant === "hero" ? "card-hero" : variant === "warm" ? "card-warm" : "card";
  return <Tag className={`${base} ${className}`}>{children}</Tag>;
}

const TINTS: Record<string, string> = {
  sand: "bg-sand/70 text-ink-soft",
  leaf: "bg-leaf-wash text-leaf-deep",
  growth: "bg-growth-wash text-growth",
  blossom: "bg-blossom-wash text-blossom",
  sky: "bg-sky-mist text-[#5c93b5]",
  mystery: "bg-mystery-wash text-mystery",
};

export type ChipTint = keyof typeof TINTS;

/**
 * A soft tinted circle behind a narrative emoji.
 *
 * Emoji are kept for story beats (the egg cracking, the tree blooming) because
 * they are content, not chrome — but they arrive in wildly different weights
 * and palettes. Wrapping them in a consistent chip makes them read as
 * intentional rather than pasted in.
 */
export function EmojiChip({
  children,
  tint = "sand",
  size = 40,
  className = "",
}: {
  children: ReactNode;
  tint?: ChipTint;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`chip ${TINTS[tint]} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span style={{ fontSize: Math.round(size * 0.5), lineHeight: 1 }}>{children}</span>
    </span>
  );
}

/** Tinted circle behind a line icon, matching EmojiChip's footprint. */
export function IconChip({
  children,
  tint = "leaf",
  size = 40,
  className = "",
}: {
  children: ReactNode;
  tint?: ChipTint;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`chip ${TINTS[tint]} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------- actions */

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
      className={`cta btn-primary w-full px-5 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
  testId,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  testId?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`cta btn-ghost w-full px-5 ${className}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ progress */

/**
 * Rounded energy bar.
 *
 * Purely a helper for the number, never the headline (principle P1): the world
 * change is the reward, the bar only explains progress.
 */
export function ProgressBar({
  value,
  max,
  label,
  testId,
  tone = "growth",
}: {
  value: number;
  max: number;
  label?: string;
  testId?: string;
  tone?: "growth" | "leaf";
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const fill =
    tone === "leaf"
      ? "linear-gradient(90deg, #9ccb92 0%, #4f8a4e 100%)"
      : "linear-gradient(90deg, #ffd08a 0%, #eaa94b 100%)";

  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full bg-sand/80"
      style={{ boxShadow: "inset 0 1px 2px rgb(120 98 70 / 0.12)" }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      data-testid={testId}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{
          width: `${pct}%`,
          background: fill,
          boxShadow: "0 1px 0 rgb(255 255 255 / 0.5) inset",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------- headers */

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="t-label mb-2.5">{children}</p>;
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
    <header className="flex items-start justify-between px-5 pt-7 pb-3">
      <div>
        <h1 className="t-title text-ink">{title}</h1>
        {subtitle ? <p className="t-caption mt-1">{subtitle}</p> : null}
      </div>
      {right}
    </header>
  );
}
