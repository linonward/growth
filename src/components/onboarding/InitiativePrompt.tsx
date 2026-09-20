"use client";

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
    <div className="rounded-card bg-white/85 px-4 py-3.5" data-testid="initiative-prompt">
      <p className="text-[14px] font-semibold text-ink">今天是谁先想到打开成长岛的？</p>
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={() => answerInitiative(day, "self")}
          data-testid="initiative-self"
          className="tap-target flex-1 rounded-button bg-leaf/25 px-3 text-[13px] font-semibold text-leaf-deep"
        >
          我自己想起来的
        </button>
        <button
          type="button"
          onClick={() => answerInitiative(day, "prompted")}
          data-testid="initiative-prompted"
          className="tap-target flex-1 rounded-button bg-sand px-3 text-[13px] font-semibold text-ink-soft"
        >
          有人提醒我的
        </button>
      </div>
    </div>
  );
}
