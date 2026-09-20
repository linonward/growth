"use client";

import { IconSparkle } from "@/components/ui/icons";
import { IconChip } from "@/components/ui/primitives";
import { usePrototypeStore } from "@/store/prototype-store";

/**
 * The self-initiated action question (spec section 15).
 *
 * Deliberately styled as a gentle two-tap choice rather than a survey, and it
 * is asked at most once per day — Day 4 in particular must keep it.
 */
export function InitiativePrompt({ day }: { day: number }) {
  const answerInitiative = usePrototypeStore((s) => s.answerInitiative);
  const pendingDay = usePrototypeStore((s) => s.pendingInitiativeDay);

  if (pendingDay !== day) return null;

  return (
    <div className="card px-4 py-4" data-testid="initiative-prompt">
      <div className="flex items-center gap-3">
        <IconChip tint="growth" size={36}>
          <IconSparkle size={17} />
        </IconChip>
        <p className="t-headline min-w-0 flex-1 text-ink">今天是谁先想到打开成长岛的？</p>
      </div>
      <div className="mt-3.5 flex gap-2.5">
        <button
          type="button"
          onClick={() => answerInitiative(day, "self")}
          data-testid="initiative-self"
          className="tap-target flex-1 rounded-button border border-leaf/35 bg-leaf-wash px-3 text-[13px] font-semibold text-leaf-deep py-2.5"
        >
          我自己想起来的
        </button>
        <button
          type="button"
          onClick={() => answerInitiative(day, "prompted")}
          data-testid="initiative-prompted"
          className="tap-target flex-1 rounded-button border border-sand-deep/45 bg-white px-3 text-[13px] font-semibold text-ink-soft py-2.5"
        >
          有人提醒我的
        </button>
      </div>
    </div>
  );
}
