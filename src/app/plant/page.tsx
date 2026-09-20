"use client";

import Link from "next/link";
import { useEffect } from "react";

import { trackPlantViewed } from "@/analytics/track";
import {
  CATEGORY_ICON,
  IconChevronRight,
  IconSparkle,
  IconStageBloom,
  IconStageLeaf,
  IconStageSprout,
  IconStageTree,
} from "@/components/ui/icons";
import { Card, IconChip, SectionLabel } from "@/components/ui/primitives";
import { PlantBadge } from "@/components/world/sprites/PlantSprite";
import { CATEGORY_LABELS, GOAL_TEMPLATES } from "@/data/goals";
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

/** The four visual milestones shown on the stage track. */
const STAGE_MARKS = [
  { at: 0, Icon: IconStageSprout, label: "发芽" },
  { at: 2, Icon: IconStageLeaf, label: "长叶" },
  { at: 5, Icon: IconStageTree, label: "成树" },
  { at: 6, Icon: IconStageBloom, label: "开花" },
] as const;

const CATEGORY_TINT = {
  reading: "sky",
  study: "growth",
  exercise: "leaf",
  interest: "blossom",
  helping: "mystery",
} as const;

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

  useEffect(() => {
    trackPlantViewed({ day, plantState: growth.plantState });
  }, [day, growth.plantState]);

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
      <header className="px-5 pt-7">
        <h1 className="t-title text-ink">成长植物</h1>
      </header>

      {/* ---- hero stage ---- */}
      <div className="px-5 pt-4">
        <div className="card-hero relative overflow-hidden px-5 pt-6 pb-5">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-36"
            style={{
              background:
                "radial-gradient(70% 100% at 50% 0%, rgb(214 238 205 / 0.6) 0%, transparent 72%)",
            }}
            aria-hidden
          />
          <div className="relative flex flex-col items-center">
            <div className="anim-float" style={{ animationDuration: "6s" }}>
              <PlantBadge state={state} size={158} />
            </div>
            <p className="mt-2 text-[21px] font-bold text-ink" data-testid="plant-name">
              知识树
            </p>
            <span
              className="chip mt-2.5 bg-leaf-wash px-3 py-1 text-[12px] font-semibold text-leaf-deep"
              data-testid="plant-state-label"
            >
              陪你成长 {day} 天 · {PLANT_STATE_LABELS[state]}
            </span>
          </div>
        </div>
      </div>

      {/* ---- stage track ---- */}
      <section className="mt-5 px-5">
        <SectionLabel>成长阶段</SectionLabel>
        <Card className="px-4 py-4">
          <div className="relative">
            {/* connector */}
            <div
              className="absolute top-4 right-5 left-5 h-0.5 rounded-full bg-sand-deep/35"
              aria-hidden
            />
            <div
              className="absolute top-4 left-5 h-0.5 rounded-full bg-leaf transition-[width] duration-500"
              style={{
                width: `calc((100% - 2.5rem) * ${stageNumber / 7})`,
              }}
              aria-hidden
            />
            <ol className="relative flex justify-between">
              {STAGE_MARKS.map(({ at, Icon, label }) => {
                const reached = stageNumber > at;
                return (
                  <li key={label} className="flex w-12 flex-col items-center gap-1.5">
                    <span
                      className={`chip h-8 w-8 border-2 transition ${
                        reached
                          ? "border-leaf-deep bg-leaf-deep text-white"
                          : "border-sand-deep/50 bg-cream text-ink-faint"
                      }`}
                      aria-hidden
                    >
                      <Icon size={16} />
                    </span>
                    <span
                      className={`text-[11px] ${reached ? "font-semibold text-leaf-deep" : "text-ink-faint"}`}
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
          <p className="t-caption mt-4 text-center" data-testid="plant-stage-current">
            当前：第 {stageNumber} 阶段 · {PLANT_STATE_LABELS[state]}
          </p>
        </Card>
      </section>

      {/* ---- records ---- */}
      <section className="mt-6 px-5" data-testid="plant-records">
        <SectionLabel>你的成长记录</SectionLabel>
        {recorded.length === 0 ? (
          <Card className="px-4 py-5">
            <p className="t-caption text-center">
              完成第一个成长目标后，这里会记录你的每一次成长。
            </p>
          </Card>
        ) : (
          <ul className="space-y-2.5">
            {recorded.map((t) => {
              const Icon = CATEGORY_ICON[t.category];
              return (
                <li
                  key={t.id}
                  className="card flex items-center gap-3.5 px-4 py-3"
                  data-testid={`plant-record-${t.id}`}
                >
                  <IconChip tint={CATEGORY_TINT[t.category]} size={36}>
                    <Icon size={18} />
                  </IconChip>
                  <span className="t-body flex-1 text-ink">
                    {CATEGORY_LABELS[t.category]}
                  </span>
                  <span className="t-body t-num font-bold text-leaf-deep">
                    {counts[t.id]} 次
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {totalDone > 0 ? (
          <p className="t-caption mt-3 text-center text-[12px]">
            到现在为止，一共完成了 {totalDone} 个成长目标。
          </p>
        ) : null}
      </section>

      {/* ---- next ---- */}
      <section className="mt-6 px-5 pb-9" data-testid="plant-next">
        <SectionLabel>距离下一次成长</SectionLabel>
        <Card variant="warm" className="px-4 py-4">
          <div className="flex items-start gap-3">
            <IconChip tint="leaf" size={38}>
              <IconSparkle size={18} />
            </IconChip>
            <div className="min-w-0 flex-1">
              {next ? (
                <>
                  <p className="t-headline text-ink">还有 {next.remaining} 成长能量</p>
                  <p className="t-caption mt-0.5">
                    到那时，它会变成「{PLANT_STATE_LABELS[next.next]}」。
                  </p>
                </>
              ) : waitingOnToday ? (
                <>
                  <p className="t-headline text-ink">完成今天的一个成长目标</p>
                  <p className="t-caption mt-0.5">它好像正准备开出花来。</p>
                </>
              ) : (
                <>
                  <p className="t-headline text-ink">今天它已经长到最好了</p>
                  <p className="t-caption mt-0.5">接下来，它会慢慢等明天。</p>
                </>
              )}
              {stageCeiling > 0 ? (
                <p className="mt-2 text-[12px] text-ink-faint">
                  当前阶段目标：{stageCeiling} 成长能量
                </p>
              ) : null}
            </div>
          </div>
        </Card>

        <Link
          href="/history"
          data-testid="plant-to-history"
          className="tap-target mt-4 gap-1 text-[13px] font-medium text-ink-soft"
        >
          看看我们一起走过的 7 天
          <IconChevronRight size={15} className="text-ink-faint" />
        </Link>
      </section>
    </div>
  );
}
