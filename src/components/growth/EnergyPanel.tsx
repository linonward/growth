"use client";

import { IconSparkle } from "@/components/ui/icons";
import { ProgressBar } from "@/components/ui/primitives";
import { MAX_ENERGY_PER_DAY } from "@/domain/constants";
import type { NextMilestone } from "@/domain/milestone";

/**
 * The home screen's three required pieces of information, minus the day badge:
 * today's growth, and the next thing worth looking forward to (spec section 3).
 *
 * The milestone is the primary element here (principle P3: there must always be
 * a next thing worth waiting for), so it gets the hero card and the only
 * call-to-action on the screen.
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
      <div className="mb-2 flex items-baseline justify-between">
        <span className="t-headline text-ink">今日成长</span>
        <span className="t-body t-num text-ink-soft" data-testid="today-energy">
          <span className="text-[17px] font-bold text-ink">{todayEnergy}</span>
          <span className="text-ink-faint"> / {MAX_ENERGY_PER_DAY}</span>
        </span>
      </div>
      <ProgressBar
        value={todayEnergy}
        max={MAX_ENERGY_PER_DAY}
        label="今日成长能量"
        testId="today-energy-bar"
      />

      <div className="card-hero mt-5 px-5 py-4" data-testid="next-milestone">
        <div className="flex items-start gap-3">
          <span className="chip mt-0.5 h-9 w-9 bg-growth-wash text-growth" aria-hidden>
            <IconSparkle size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="t-headline text-ink" data-testid="milestone-title">
              {milestone.title}
            </p>
            <p className="t-caption mt-1" data-testid="milestone-detail">
              {milestone.detail}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCta}
          data-testid="milestone-cta"
          className="cta btn-primary mt-4 w-full px-4"
        >
          {milestone.ctaLabel}
        </button>
      </div>
    </div>
  );
}
