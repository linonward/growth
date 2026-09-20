"use client";

import { useEffect } from "react";

import { EmojiChip } from "@/components/ui/primitives";
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
      <header className="px-5 pt-7">
        <h1 className="t-title text-ink">我的成长轨迹</h1>
      </header>

      <section className="px-5 pt-4" data-testid="history-summary">
        <div className="card-hero px-5 py-6 text-center">
          <p className="t-display text-ink" data-testid="history-days">
            {currentDay} 天
          </p>
          <p className="t-caption mt-1.5" data-testid="history-goals">
            完成 {completedCount} 个成长目标
          </p>
          <p className="t-headline mt-4 text-leaf-deep">创造了一个属于自己的世界</p>
        </div>
      </section>

      <ol className="mt-6 px-5 pb-9" data-testid="history-timeline">
        {days.map((n, i) => {
          const goals = goalsByDay[n.day] ?? [];
          const done = goals.filter((g) => g.completed).length;
          const isLast = i === days.length - 1;
          return (
            <li key={n.day} className="relative flex gap-3.5">
              {/* timeline rail */}
              <div className="relative flex w-10 shrink-0 flex-col items-center">
                <EmojiChip tint={i === 0 ? "growth" : "sand"} size={40}>
                  {n.emoji}
                </EmojiChip>
                {!isLast ? (
                  <span
                    className="mt-1 w-0.5 flex-1 rounded-full bg-sand-deep/40"
                    aria-hidden
                  />
                ) : null}
              </div>

              <div
                className={`min-w-0 flex-1 ${isLast ? "pb-0" : "pb-6"}`}
                data-testid={`history-day-${n.day}`}
              >
                <div className="card px-4 py-3.5">
                  <p className="t-label">DAY {n.day}</p>
                  <p className="t-headline mt-1.5 text-ink">{n.headline}</p>
                  <p className="t-caption mt-1">{n.historyLine}</p>
                  {goals.length > 0 ? (
                    <p className="mt-2.5 inline-flex rounded-full bg-leaf-wash px-2.5 py-1 text-[12px] font-semibold text-leaf-deep">
                      完成 {done} 个成长目标
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="t-caption px-5 pb-9 text-center text-[12px]">
        {worldName} · 由你一点点创造
      </p>
    </div>
  );
}
