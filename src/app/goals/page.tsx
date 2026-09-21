"use client";

import { useState } from "react";

import { CATEGORY_ICON, IconCheck, IconChevronRight } from "@/components/ui/icons";
import { IconChip, ProgressBar } from "@/components/ui/primitives";
import { CATEGORY_TINT } from "@/components/ui/tints";
import { GOAL_GROUPS, getGoalTemplate, templatesInGroup } from "@/data/goals";
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

  const [picked, setPicked] = useState<string[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const started = goals.length > 0;
  const completedCount = goals.filter((g) => g.completed).length;

  // ---- Task state -------------------------------------------------------
  if (started) {
    const confirming = goals.find((g) => g.id === confirmingId);
    const confirmingTemplate = confirming
      ? getGoalTemplate(confirming.templateId)
      : undefined;
    const allDone = completedCount === goals.length;

    return (
      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        data-testid="goals-tasks"
      >
        <header className="px-5 pt-7 pb-4">
          <p className="t-label">DAY {day}</p>
          <h1 className="t-title mt-1.5 text-ink">今天的成长</h1>
          <p className="t-caption mt-1">
            {allDone
              ? "今天的成长都做到了。"
              : `还有 ${goals.length - completedCount} 个等着你`}
          </p>
        </header>

        <ul className="space-y-3 px-5">
          {goals.map((goal) => {
            const template = getGoalTemplate(goal.templateId);
            if (!template) return null;
            const Icon = CATEGORY_ICON[template.category];
            const tint = CATEGORY_TINT[template.category];
            return (
              <li key={goal.id}>
                <button
                  type="button"
                  data-testid={`goal-item-${goal.templateId}`}
                  data-completed={goal.completed}
                  disabled={goal.completed}
                  onClick={() => setConfirmingId(goal.id)}
                  className={`flex w-full items-center gap-3.5 rounded-card px-4 py-4 text-left transition ${
                    goal.completed
                      ? "border border-leaf/30 bg-leaf-wash/70"
                      : "card hover:-translate-y-px"
                  }`}
                >
                  <IconChip tint={goal.completed ? "leaf" : tint} size={42}>
                    <Icon size={21} />
                  </IconChip>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="t-headline text-ink">{template.title}</span>
                      <span className="shrink-0 rounded-full bg-sand/70 px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                        {template.amount}
                      </span>
                    </span>
                    <span className="t-caption mt-1 block text-[12px]">
                      {goal.completed ? "已完成" : `完成后 +${ENERGY_PER_GOAL} 成长能量`}
                    </span>
                  </span>
                  {goal.completed ? (
                    <span className="chip h-7 w-7 bg-leaf-deep text-white" aria-hidden>
                      <IconCheck size={15} />
                    </span>
                  ) : (
                    <IconChevronRight size={18} className="shrink-0 text-ink-faint" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Day progress — anchored to the bottom so a short list doesn't leave
            the screen looking half-finished. */}
        <div className="mt-auto px-5 pt-7 pb-9">
          <div className="card-warm px-4 py-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="t-headline text-ink">今日成长</span>
              <span
                className="t-body t-num text-ink-soft"
                data-testid="goals-today-energy"
              >
                <span className="text-[17px] font-bold text-ink">{todayEnergy}</span>
                <span className="text-ink-faint"> / {MAX_ENERGY_PER_DAY}</span>
              </span>
            </div>
            <ProgressBar
              value={todayEnergy}
              max={MAX_ENERGY_PER_DAY}
              label="今日成长能量"
            />
            {allDone ? (
              <p
                className="t-caption mt-3 text-center font-semibold text-leaf-deep"
                data-testid="goals-all-done"
              >
                今天的成长都做到了。
              </p>
            ) : null}
          </div>
        </div>

        {/* ---- Confirmation sheet ---- */}
        {confirming && confirmingTemplate ? (
          <div
            className="absolute inset-0 z-30 flex items-end bg-ink/30 backdrop-blur-[2px]"
            data-testid="goal-confirm-dialog"
            role="dialog"
            aria-modal="true"
          >
            <div className="anim-rise w-full rounded-t-[28px] bg-cream px-6 pt-7 pb-9 shadow-[0_-20px_50px_-20px_rgb(120_98_70/0.5)]">
              <div
                className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-sand-deep/60"
                aria-hidden
              />
              <p className="t-title text-ink">完成了吗？</p>
              <div className="mt-4 flex items-center gap-3.5 rounded-card bg-white/70 px-4 py-3.5">
                <IconChip tint={CATEGORY_TINT[confirmingTemplate.category]} size={42}>
                  {(() => {
                    const Icon = CATEGORY_ICON[confirmingTemplate.category];
                    return <Icon size={21} />;
                  })()}
                </IconChip>
                <span className="t-headline text-ink">{confirmingTemplate.title}</span>
              </div>
              <div className="mt-6 space-y-2.5">
                <button
                  type="button"
                  data-testid="goal-confirm-yes"
                  onClick={() => {
                    completeGoal(confirming.id);
                    setConfirmingId(null);
                  }}
                  className="cta btn-primary w-full px-5"
                >
                  今天做到了
                </button>
                <button
                  type="button"
                  data-testid="goal-confirm-no"
                  onClick={() => setConfirmingId(null)}
                  className="cta btn-ghost w-full px-5"
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
    <div className="flex min-h-0 flex-1 flex-col" data-testid="goal-picker">
      <header className="px-5 pt-7 pb-1">
        <p className="t-label">DAY {day}</p>
        <h1 className="t-title mt-1.5 text-ink">今天想做些什么？</h1>
        <p className="t-caption mt-1">选择最多 {MAX_GOALS_PER_DAY} 个成长目标</p>
      </header>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-5 pb-2">
        {GOAL_GROUPS.map((group) => (
          <section key={group.id} className="mb-5 last:mb-0">
            <div className="mb-2.5 flex items-baseline gap-2">
              <h2 className="t-label">{group.label}</h2>
              <span className="text-[11px] text-ink-faint">{group.hint}</span>
            </div>
            <ul className="space-y-3">
              {templatesInGroup(group.id).map((template) => {
                const selected = picked.includes(template.id);
                const Icon = CATEGORY_ICON[template.category];
                const tint = CATEGORY_TINT[template.category];
                return (
                  <li key={template.id}>
                    <button
                      type="button"
                      data-testid={`goal-option-${template.id}`}
                      data-selected={selected}
                      aria-pressed={selected}
                      onClick={() => toggle(template.id)}
                      className={`flex w-full items-center gap-3.5 rounded-card px-4 py-3.5 text-left transition ${
                        selected
                          ? "border border-leaf-deep/45 bg-leaf-wash shadow-soft"
                          : "card hover:-translate-y-px"
                      }`}
                    >
                      <IconChip tint={selected ? "leaf" : tint} size={42}>
                        <Icon size={21} />
                      </IconChip>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="t-headline text-ink">{template.title}</span>
                          {/* The concrete measure — what makes the goal checkable. */}
                          <span className="shrink-0 rounded-full bg-sand/70 px-2 py-0.5 text-[11px] font-semibold text-ink-soft">
                            {template.amount}
                          </span>
                        </span>
                        <span className="t-caption mt-1 block text-[12px]">
                          {template.description}
                        </span>
                      </span>
                      <span
                        className={`chip h-7 w-7 shrink-0 border transition ${
                          selected
                            ? "border-leaf-deep bg-leaf-deep text-white"
                            : "border-sand-deep/60 text-transparent"
                        }`}
                        aria-hidden
                      >
                        <IconCheck size={15} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="shrink-0 border-t border-sand-deep/35 bg-cream/95 px-5 pt-4 pb-6 backdrop-blur">
        <div className="mb-3 flex items-center justify-center gap-2">
          {Array.from({ length: MAX_GOALS_PER_DAY }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i < picked.length ? "w-5 bg-leaf-deep" : "w-1.5 bg-sand-deep/60"
              }`}
              aria-hidden
            />
          ))}
          <span className="t-caption ml-2 font-semibold" data-testid="goal-pick-count">
            已选择 {picked.length} / {MAX_GOALS_PER_DAY}
          </span>
        </div>
        <button
          type="button"
          disabled={picked.length === 0}
          data-testid="goal-start"
          onClick={() => selectGoals(day, picked)}
          className="cta btn-primary w-full px-5"
        >
          开始今天的成长
        </button>
      </div>
    </div>
  );
}
