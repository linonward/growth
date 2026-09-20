"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Card, ProgressBar } from "@/components/ui/primitives";
import { PlantBadge } from "@/components/world/sprites/PlantSprite";
import { CATEGORY_EMOJI, CATEGORY_LABELS, GOAL_TEMPLATES } from "@/data/goals";
import {
  energyToNextPlantState,
  PLANT_ENERGY_THRESHOLDS,
  PLANT_STAGE_NUMBER,
  PLANT_STATE_LABELS,
  PLANT_STATE_ORDER,
} from "@/domain/plant";
import {
  useCategoryCounts,
  useGrowth,
  useTodayEnergy,
  useTotalEnergy,
} from "@/store/hooks";
import { usePrototypeStore } from "@/store/prototype-store";

/**
 * Page 05 — 成长植物 (spec section 8).
 *
 * The plant carries long-term accumulation while the pet carries companionship:
 * this page is mostly a record of what the student actually did.
 */
export default function PlantPage() {
  const growth = useGrowth();
  const totalEnergy = useTotalEnergy();
  const todayEnergy = useTodayEnergy();
  const day = usePrototypeStore((s) => s.currentDay);
  const counts = useCategoryCounts();
  const logEvent = usePrototypeStore((s) => s.logEvent);

  useEffect(() => {
    logEvent("plant_viewed", { day, state: growth.plantState });
  }, [day, growth.plantState, logEvent]);

  const state = growth.plantState;
  const stateIndex = PLANT_STATE_ORDER.indexOf(state);
  const stageCeiling = PLANT_ENERGY_THRESHOLDS[stateIndex + 1] ?? totalEnergy;
  const next = energyToNextPlantState(day, totalEnergy, todayEnergy);
  const stageNumber = PLANT_STAGE_NUMBER[state];
  const waitingOnToday = !next && day === 7 && todayEnergy === 0;

  const recorded = GOAL_TEMPLATES.filter((t) => (counts[t.id] ?? 0) > 0);
  const totalDone = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      data-testid="plant-page"
    >
      <header className="px-5 pt-6">
        <h1 className="text-[20px] font-bold text-ink">成长植物</h1>
      </header>

      <div className="flex flex-col items-center px-5 pt-3">
        <div className="anim-float" style={{ animationDuration: "6s" }}>
          <PlantBadge state={state} size={148} />
        </div>
        <p className="mt-2 text-[19px] font-bold text-ink" data-testid="plant-name">
          知识树
        </p>
        <p className="mt-1 text-[13px] text-ink-soft" data-testid="plant-state-label">
          你已经陪它成长 {day} 天 · {PLANT_STATE_LABELS[state]}
        </p>
      </div>

      <section className="mt-6 px-5">
        <p className="mb-2 text-[12px] font-semibold tracking-wide text-ink-faint">
          成长阶段
        </p>
        <Card>
          <div className="flex items-center justify-between text-[20px]">
            <span aria-hidden>🌱</span>
            <span className="text-[12px] text-ink-faint" aria-hidden>
              →
            </span>
            <span aria-hidden>🌿</span>
            <span className="text-[12px] text-ink-faint" aria-hidden>
              →
            </span>
            <span aria-hidden>🌳</span>
            <span className="text-[12px] text-ink-faint" aria-hidden>
              →
            </span>
            <span aria-hidden>🌸</span>
          </div>
          <div className="mt-3">
            <ProgressBar
              value={PLANT_STAGE_NUMBER[state]}
              max={7}
              label="植物成长阶段"
              testId="plant-stage-bar"
            />
          </div>
          <p className="mt-3 text-[14px] text-ink" data-testid="plant-stage-current">
            当前：第 {stageNumber} 阶段 · {PLANT_STATE_LABELS[state]}
          </p>
        </Card>
      </section>

      <section className="mt-6 px-5" data-testid="plant-records">
        <p className="mb-2 text-[12px] font-semibold tracking-wide text-ink-faint">
          你的成长记录
        </p>
        {recorded.length === 0 ? (
          <Card>
            <p className="text-[13px] text-ink-soft">
              完成第一个成长目标后，这里会记录你的每一次成长。
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {recorded.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-card bg-white/70 px-4 py-3"
                data-testid={`plant-record-${t.id}`}
              >
                <span className="text-[18px]" aria-hidden>
                  {CATEGORY_EMOJI[t.category]}
                </span>
                <span className="flex-1 text-[14px] text-ink">
                  {CATEGORY_LABELS[t.category]}
                </span>
                <span className="text-[14px] font-semibold tabular-nums text-leaf-deep">
                  {counts[t.id]} 次
                </span>
              </li>
            ))}
          </ul>
        )}
        {totalDone > 0 ? (
          <p className="mt-3 text-[12px] text-ink-faint">
            到现在为止，一共完成了 {totalDone} 个成长目标。
          </p>
        ) : null}
      </section>

      <section className="mt-6 px-5 pb-8" data-testid="plant-next">
        <p className="mb-2 text-[12px] font-semibold tracking-wide text-ink-faint">
          距离下一次成长
        </p>
        <Card>
          {next ? (
            <>
              <p className="text-[14px] font-semibold text-ink">
                还有 {next.remaining} 成长能量
              </p>
              <p className="mt-1 text-[13px] text-ink-soft">
                到那时，它会变成「{PLANT_STATE_LABELS[next.next]}」。
              </p>
            </>
          ) : waitingOnToday ? (
            <>
              <p className="text-[14px] font-semibold text-ink">完成今天的一个成长目标</p>
              <p className="mt-1 text-[13px] text-ink-soft">它好像正准备开出花来。</p>
            </>
          ) : (
            <>
              <p className="text-[14px] font-semibold text-ink">今天它已经长到最好了</p>
              <p className="mt-1 text-[13px] text-ink-soft">接下来，它会慢慢等明天。</p>
            </>
          )}
          {stageCeiling > 0 ? (
            <p className="mt-2 text-[12px] text-ink-faint">
              当前阶段目标：{stageCeiling} 成长能量
            </p>
          ) : null}
        </Card>

        <Link
          href="/history"
          data-testid="plant-to-history"
          className="tap-target mt-4 text-[13px] text-ink-soft underline decoration-sand decoration-2 underline-offset-4"
        >
          看看我们一起走过的 7 天
        </Link>
      </section>
    </div>
  );
}
