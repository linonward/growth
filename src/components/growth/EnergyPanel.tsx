"use client";

import { ProgressBar } from "@/components/ui/primitives";
import { MAX_ENERGY_PER_DAY } from "@/domain/constants";
import type { NextMilestone } from "@/domain/milestone";

/**
 * The home screen's three required pieces of information, minus the day badge:
 * today's growth, and the next thing worth looking forward to (spec section 3).
 */
export function EnergyPanel({
  todayEnergy,
  milestone,
  onCta,
}: {
  todayEnergy: number;
  milestone: NextMilestone;
  onCta: () => void;
}) {
  return (
    <div className="px-5">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[14px] font-semibold text-ink">今日成长</span>
        <span
          className="text-[14px] tabular-nums text-ink-soft"
          data-testid="today-energy"
        >
          {todayEnergy} / {MAX_ENERGY_PER_DAY}
        </span>
      </div>
      <ProgressBar
        value={todayEnergy}
        max={MAX_ENERGY_PER_DAY}
        label="今日成长能量"
        testId="today-energy-bar"
      />

      <div
        className="mt-4 rounded-card bg-parchment px-4 py-3.5"
        data-testid="next-milestone"
      >
        <p className="text-[15px] font-semibold text-ink" data-testid="milestone-title">
          {milestone.title}
        </p>
        <p
          className="mt-1 text-[13px] leading-relaxed text-ink-soft"
          data-testid="milestone-detail"
        >
          {milestone.detail}
        </p>
        <button
          type="button"
          onClick={onCta}
          data-testid="milestone-cta"
          className="tap-target mt-2.5 w-full rounded-button bg-leaf-deep px-4 text-[14px] font-semibold text-white"
        >
          {milestone.ctaLabel}
        </button>
      </div>
    </div>
  );
}
