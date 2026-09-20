"use client";

import { useEffect, useState } from "react";

import { ProgressBar } from "@/components/ui/primitives";
import { CATEGORY_LABELS, GOAL_TEMPLATES, getGoalTemplate } from "@/data/goals";
import {
  ENERGY_PER_GOAL,
  MAX_ENERGY_PER_DAY,
  MAX_GOALS_PER_DAY,
} from "@/domain/constants";
import { useGrowth, useTodayEnergy, useTodayGoals } from "@/store/hooks";
import { usePrototypeStore } from "@/store/prototype-store";

/**
 * Page 02 — 今日成长 (spec section 4).
 *
 * Framed as "which way do I want to grow today?" rather than a todo list, and
 * deliberately capped at three preset choices with no free text in Phase 0.
 */
export default function GoalsPage() {
  const day = usePrototypeStore((s) => s.currentDay);
  const goals = useTodayGoals();
  const todayEnergy = useTodayEnergy();
  const growth = useGrowth();
  const selectGoals = usePrototypeStore((s) => s.selectGoals);
  const completeGoal = usePrototypeStore((s) => s.completeGoal);
  const logEvent = usePrototypeStore((s) => s.logEvent);

  const [picked, setPicked] = useState<string[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    logEvent("goals_viewed", { day });
  }, [day, logEvent]);

  const started = goals.length > 0;
  const completedCount = goals.filter((g) => g.completed).length;

  // ---- Task state -------------------------------------------------------
  if (started) {
    const confirming = goals.find((g) => g.id === confirmingId);
    const confirmingTemplate = confirming
      ? getGoalTemplate(confirming.templateId)
      : undefined;

    return (
      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        data-testid="goals-tasks"
      >
        <header className="px-5 pt-6 pb-3">
          <p className="text-[12px] font-semibold tracking-wide text-ink-faint">
            Day {day}
          </p>
          <h1 className="mt-0.5 text-[20px] font-bold text-ink">今天的成长</h1>
        </header>

        <ul className="space-y-2.5 px-5">
          {goals.map((goal) => {
            const template = getGoalTemplate(goal.templateId);
            if (!template) return null;
            return (
              <li key={goal.id}>
                <button
                  type="button"
                  data-testid={`goal-item-${goal.templateId}`}
                  data-completed={goal.completed}
                  disabled={goal.completed}
                  onClick={() => setConfirmingId(goal.id)}
                  className={`flex w-full items-center gap-3 rounded-card border px-4 py-4 text-left transition ${
                    goal.completed
                      ? "border-leaf/40 bg-leaf/10"
                      : "border-sand bg-white/80 hover:border-leaf/60"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[13px] ${
                      goal.completed
                        ? "border-leaf-deep bg-leaf-deep text-white"
                        : "border-sand text-transparent"
                    }`}
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-ink">
                      {template.emoji} {template.title}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-ink-faint">
                      {goal.completed ? "已完成" : `完成后 +${ENERGY_PER_GOAL} 成长能量`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-7 px-5 pb-8">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[14px] font-semibold text-ink">今日成长</span>
            <span
              className="text-[14px] tabular-nums text-ink-soft"
              data-testid="goals-today-energy"
            >
              {todayEnergy} / {MAX_ENERGY_PER_DAY}
            </span>
          </div>
          <ProgressBar
            value={todayEnergy}
            max={MAX_ENERGY_PER_DAY}
            label="今日成长能量"
          />

          {completedCount === goals.length ? (
            <p
              className="mt-5 text-center text-[14px] text-leaf-deep"
              data-testid="goals-all-done"
            >
              今天的成长都做到了。
            </p>
          ) : null}
        </div>

        {/* ---- Confirmation sheet ---- */}
        {confirming && confirmingTemplate ? (
          <div
            className="absolute inset-0 z-30 flex items-end bg-ink/25 backdrop-blur-[1px]"
            data-testid="goal-confirm-dialog"
            role="dialog"
            aria-modal="true"
          >
            <div className="anim-rise w-full rounded-t-[24px] bg-cream px-6 pt-6 pb-8">
              <p className="text-[17px] font-bold text-ink">完成了吗？</p>
              <p className="mt-2 text-[15px] text-ink-soft">
                {confirmingTemplate.emoji} {confirmingTemplate.title}
              </p>
              <div className="mt-6 space-y-2.5">
                <button
                  type="button"
                  data-testid="goal-confirm-yes"
                  onClick={() => {
                    completeGoal(confirming.id);
                    setConfirmingId(null);
                  }}
                  className="cta w-full bg-leaf-deep px-5 text-[15px] font-semibold text-white"
                >
                  今天做到了
                </button>
                <button
                  type="button"
                  data-testid="goal-confirm-no"
                  onClick={() => setConfirmingId(null)}
                  className="cta w-full border border-sand bg-white/70 px-5 text-[15px] text-ink-soft"
                >
                  还没有
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Keeps the growth state referenced so the page stays a pure read of it. */}
        <span className="hidden" data-testid="goals-pet-state">
          {growth.petState}
        </span>
      </div>
    );
  }

  // ---- Selection state --------------------------------------------------
  const toggle = (id: string) => {
    setPicked((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      if (current.length >= MAX_GOALS_PER_DAY) return current;
      return [...current, id];
    });
  };

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      data-testid="goal-picker"
    >
      <header className="px-5 pt-6 pb-1">
        <h1 className="text-[20px] font-bold text-ink">今天想做些什么？</h1>
        <p className="mt-1 text-[13px] text-ink-soft">
          选择最多 {MAX_GOALS_PER_DAY} 个成长目标
        </p>
      </header>

      <ul className="mt-4 space-y-2.5 px-5">
        {GOAL_TEMPLATES.map((template) => {
          const selected = picked.includes(template.id);
          return (
            <li key={template.id}>
              <button
                type="button"
                data-testid={`goal-option-${template.id}`}
                data-selected={selected}
                aria-pressed={selected}
                onClick={() => toggle(template.id)}
                className={`flex w-full items-center gap-3 rounded-card border px-4 py-4 text-left transition ${
                  selected
                    ? "border-leaf-deep bg-leaf/12"
                    : "border-sand bg-white/80 hover:border-leaf/50"
                }`}
              >
                <span className="text-[20px]" aria-hidden>
                  {template.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink">
                    {template.title}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-ink-faint">
                    {template.description} · {CATEGORY_LABELS[template.category]}
                  </span>
                </span>
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[13px] ${
                    selected
                      ? "border-leaf-deep bg-leaf-deep text-white"
                      : "border-sand text-transparent"
                  }`}
                  aria-hidden
                >
                  ✓
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto px-5 pt-6 pb-8">
        <p
          className="mb-3 text-center text-[13px] text-ink-soft"
          data-testid="goal-pick-count"
        >
          已选择 {picked.length} / {MAX_GOALS_PER_DAY}
        </p>
        <button
          type="button"
          disabled={picked.length === 0}
          data-testid="goal-start"
          onClick={() => selectGoals(day, picked)}
          className={`cta w-full px-5 text-[15px] font-semibold text-white ${
            picked.length === 0 ? "bg-ink-faint/40" : "bg-leaf-deep"
          }`}
        >
          开始今天的成长
        </button>
      </div>
    </div>
  );
}
