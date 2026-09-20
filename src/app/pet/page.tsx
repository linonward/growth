"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Card, ProgressBar } from "@/components/ui/primitives";
import { PetBadge } from "@/components/world/sprites/PetSprite";
import { DAY_NARRATIVES } from "@/data/days";
import { MAX_TOTAL_ENERGY } from "@/domain/constants";
import {
  energyToNextPetState,
  isPetBorn,
  PET_ENERGY_THRESHOLDS,
  PET_STATE_LABELS,
  PET_STATE_ORDER,
} from "@/domain/pet";
import { useGrowth, useTodayEnergy, useTotalEnergy } from "@/store/hooks";
import { usePrototypeStore } from "@/store/prototype-store";

/** Warm, non-clinical status lines. Never mentions failure (principle P5). */
const MOODS: Record<string, string> = {
  egg: "它睡得很安稳。",
  wiggling_egg: "它好像在里面动了一下。",
  cracked_egg: "它今天看起来很想出来。",
  baby: "它今天看起来很开心。",
  young: "它今天看起来很有精神。",
  evolved: "它今天看起来闪闪发光。",
};

/**
 * Page 04 — 我的伙伴 (spec section 6).
 *
 * Built for emotional attachment, not for a pet-simulation loop: one creature,
 * a name, a stage, and what happened recently.
 */
export default function PetPage() {
  const growth = useGrowth();
  const totalEnergy = useTotalEnergy();
  const todayEnergy = useTodayEnergy();
  const petName = usePrototypeStore((s) => s.profile.petName);
  const renamePet = usePrototypeStore((s) => s.renamePet);
  const day = usePrototypeStore((s) => s.currentDay);
  const logEvent = usePrototypeStore((s) => s.logEvent);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(petName);

  useEffect(() => {
    logEvent("pet_viewed", { day, state: growth.petState });
  }, [day, growth.petState, logEvent]);

  const state = growth.petState;
  const stateIndex = PET_STATE_ORDER.indexOf(state);
  const stageFloor = PET_ENERGY_THRESHOLDS[stateIndex] ?? 0;
  const stageCeiling = PET_ENERGY_THRESHOLDS[stateIndex + 1] ?? MAX_TOTAL_ENERGY;
  const next = energyToNextPetState(day, totalEnergy, todayEnergy);
  const born = isPetBorn(state);
  const daysSinceBorn = Math.max(1, day - 2);
  // On the final day the pet is waiting for one more real action, not tomorrow.
  const waitingOnToday = !next && day === 7 && todayEnergy === 0;

  const recent = DAY_NARRATIVES.filter((n) => n.day <= day)
    .slice(-3)
    .reverse();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" data-testid="pet-page">
      <header className="px-5 pt-6">
        <h1 className="text-[20px] font-bold text-ink">我的伙伴</h1>
      </header>

      <div className="flex flex-col items-center px-5 pt-4">
        <div className="anim-float" data-testid="pet-badge">
          <PetBadge state={state} size={132} />
        </div>

        {editing ? (
          <div className="mt-3 flex w-full max-w-[240px] items-center gap-2">
            <input
              value={draft}
              maxLength={8}
              autoFocus
              aria-label="伙伴名字"
              data-testid="pet-name-input"
              onChange={(e) => setDraft(e.target.value)}
              className="w-full rounded-button border border-sand bg-white px-3 py-2 text-center text-[16px] outline-none focus:border-leaf"
            />
            <button
              type="button"
              data-testid="pet-name-save"
              onClick={() => {
                renamePet(draft);
                setEditing(false);
              }}
              className="tap-target rounded-button bg-leaf-deep px-3 text-[13px] font-semibold text-white"
            >
              好
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-testid="pet-name-button"
            onClick={() => {
              setDraft(petName);
              setEditing(true);
            }}
            className="tap-target mt-3 gap-1.5 rounded-full px-3"
          >
            <span className="text-[19px] font-bold text-ink" data-testid="pet-name">
              {petName}
            </span>
            <span className="text-[12px] text-ink-faint">✎</span>
          </button>
        )}

        <p className="mt-1 text-[12px] text-ink-faint">
          {born ? `来到世界第 ${daysSinceBorn} 天` : `蛋里的第 ${day} 天`}
        </p>
        <p className="mt-0.5 text-[13px] text-ink-soft" data-testid="pet-state-label">
          {PET_STATE_LABELS[state]}
        </p>
      </div>

      <div className="mt-6 px-5">
        <Card>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[14px] font-semibold text-ink">成长能量</span>
            <span className="text-[13px] tabular-nums text-ink-soft">
              {totalEnergy} / {stageCeiling}
            </span>
          </div>
          <ProgressBar
            value={totalEnergy}
            max={stageCeiling}
            label="成长能量"
            testId="pet-energy-bar"
          />
          <p className="mt-3 text-[14px] text-ink-soft" data-testid="pet-mood">
            {MOODS[state] ?? "它今天看起来不错。"}
          </p>
          {stageFloor > 0 ? (
            <p className="mt-1 text-[12px] text-ink-faint">
              这个阶段的起点是 {stageFloor} 成长能量
            </p>
          ) : null}
        </Card>
      </div>

      <section className="mt-6 px-5" data-testid="pet-recent">
        <p className="mb-2 text-[12px] font-semibold tracking-wide text-ink-faint">
          最近发生
        </p>
        <ul className="space-y-2">
          {recent.map((n, i) => (
            <li
              key={n.day}
              className="flex items-center gap-3 rounded-card bg-white/70 px-4 py-3"
            >
              <span className="text-[20px]" aria-hidden>
                {n.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-ink">
                  {i === 0 ? "今天" : i === 1 ? "昨天" : `Day ${n.day}`}
                </span>
                <span className="mt-0.5 block text-[12px] text-ink-soft">
                  {n.headline}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 px-5 pb-8" data-testid="pet-next">
        <p className="mb-2 text-[12px] font-semibold tracking-wide text-ink-faint">
          下一次成长
        </p>
        <Card>
          {next ? (
            <>
              <p className="text-[14px] font-semibold text-ink">
                再获得 {next.remaining} 成长能量
              </p>
              <p className="mt-1 text-[13px] text-ink-soft">可能会发生新的变化</p>
            </>
          ) : waitingOnToday ? (
            <>
              <p className="text-[14px] font-semibold text-ink">完成今天的一个成长目标</p>
              <p className="mt-1 text-[13px] text-ink-soft">
                它好像感觉到了什么，正在等你。
              </p>
            </>
          ) : (
            <>
              <p className="text-[14px] font-semibold text-ink">今天先到这里</p>
              <p className="mt-1 text-[13px] text-ink-soft">明天，它可能会有新的样子。</p>
            </>
          )}
        </Card>

        <Link
          href="/history"
          data-testid="pet-to-history"
          className="tap-target mt-4 text-[13px] text-ink-soft underline decoration-sand decoration-2 underline-offset-4"
        >
          看看我们一起走过的 7 天
        </Link>
      </section>
    </div>
  );
}
