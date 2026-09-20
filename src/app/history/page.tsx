"use client";

import { useEffect } from "react";

import { DAY_NARRATIVES } from "@/data/days";
import { useCompletedGoalCount } from "@/store/hooks";
import { usePrototypeStore } from "@/store/prototype-store";

/**
 * Page 06 — 成长轨迹 (spec section 10).
 *
 * The purpose is for the student to realise "I built this world", so it reads
 * as a story timeline. No rankings, no statistics tables.
 */
export default function HistoryPage() {
  const currentDay = usePrototypeStore((s) => s.currentDay);
  const completedCount = useCompletedGoalCount();
  const goalsByDay = usePrototypeStore((s) => s.goalsByDay);
  const worldName = usePrototypeStore((s) => s.profile.worldName);
  const logEvent = usePrototypeStore((s) => s.logEvent);

  useEffect(() => {
    logEvent("history_viewed", { day: currentDay });
  }, [currentDay, logEvent]);

  const days = DAY_NARRATIVES.filter((n) => n.day <= currentDay)
    .slice()
    .reverse();

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      data-testid="history-page"
    >
      <header className="px-5 pt-6">
        <h1 className="text-[20px] font-bold text-ink">我的成长轨迹</h1>
      </header>

      <section className="px-5 pt-4" data-testid="history-summary">
        <div className="rounded-card bg-parchment px-5 py-5 text-center">
          <p className="text-[30px] font-bold text-ink" data-testid="history-days">
            {currentDay} 天
          </p>
          <p className="mt-1 text-[14px] text-ink-soft" data-testid="history-goals">
            完成 {completedCount} 个成长目标
          </p>
          <p className="mt-3 text-[14px] font-semibold text-leaf-deep">
            创造了一个属于自己的世界
          </p>
        </div>
      </section>

      <ol className="mt-6 space-y-2.5 px-5 pb-8" data-testid="history-timeline">
        {days.map((n) => {
          const goals = goalsByDay[n.day] ?? [];
          const done = goals.filter((g) => g.completed).length;
          const hasRecord = goals.length > 0;
          return (
            <li
              key={n.day}
              data-testid={`history-day-${n.day}`}
              className="relative rounded-card border border-sand bg-white/80 px-4 py-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-[24px] leading-none" aria-hidden>
                  {n.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold tracking-wide text-ink-faint">
                    Day {n.day}
                  </p>
                  <p className="mt-1 text-[15px] font-semibold text-ink">{n.headline}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                    {n.historyLine}
                  </p>
                  {hasRecord ? (
                    <p className="mt-2 text-[12px] text-leaf-deep">
                      完成 {done} 个成长目标
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="px-5 pb-8 text-center text-[12px] text-ink-faint">
        {worldName} · 由你一点点创造
      </p>
    </div>
  );
}
