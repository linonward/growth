"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { EnergyPanel } from "@/components/growth/EnergyPanel";
import { InitiativePrompt } from "@/components/onboarding/InitiativePrompt";
import { SCENE, WorldScene } from "@/components/world/WorldScene";
import { getCloudCount } from "@/domain/world";
import { useGrowth, useMilestone, useTodayEnergy } from "@/store/hooks";
import { usePrototypeStore } from "@/store/prototype-store";

/** Scene coordinates -> percentage positions for the tap targets. */
function pct(x: number, y: number) {
  return { left: `${(x / SCENE.width) * 100}%`, top: `${(y / SCENE.height) * 100}%` };
}

/**
 * Page 01 — 我的世界 (spec section 3).
 *
 * The most important screen: the first thing a student sees must be what their
 * behaviour did to the world, in this order: Day, today's growth, and the next
 * thing worth looking forward to.
 */
export default function WorldPage() {
  const router = useRouter();

  const growth = useGrowth();
  const todayEnergy = useTodayEnergy();
  const milestone = useMilestone();
  const worldName = usePrototypeStore((s) => s.profile.worldName);
  const petName = usePrototypeStore((s) => s.profile.petName);
  const petSpecies = usePrototypeStore((s) => s.profile.petSpecies);
  const pendingInitiativeDay = usePrototypeStore((s) => s.pendingInitiativeDay);
  const logEvent = usePrototypeStore((s) => s.logEvent);

  const day = growth.currentDay;

  useEffect(() => {
    logEvent("world_viewed", { day });
  }, [day, logEvent]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* ---- World (roughly the top half of the screen) ---- */}
      <div className="relative shrink-0" data-testid="world-area">
        <div className="flex items-center justify-between px-5 pt-5">
          <button
            type="button"
            data-testid="day-badge"
            onClick={() => router.push("/history")}
            className="tap-target rounded-full px-1 text-left"
          >
            <span className="block text-[17px] font-bold text-ink">Day {day}</span>
            <span className="block text-[11px] text-ink-faint">
              一起成长的第 {day} 天
            </span>
          </button>
          <span className="text-[20px]" aria-hidden>
            ☀️
          </span>
        </div>

        <WorldScene
          day={day}
          petState={growth.petState}
          plantState={growth.plantState}
          worldState={growth.worldState}
          petSpecies={petSpecies}
          petName={petName}
          cloudCount={getCloudCount(day)}
          className="block w-full"
        />

        {/* Tap targets sit above the SVG so they keep real 44x44 hit areas. */}
        <button
          type="button"
          aria-label={`查看我的伙伴 ${petName}`}
          data-testid="scene-pet"
          onClick={() => router.push("/pet")}
          className="absolute h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={pct(SCENE.pet.x, SCENE.pet.y - 30)}
        />
        <button
          type="button"
          aria-label="查看成长植物"
          data-testid="scene-plant"
          onClick={() => router.push("/plant")}
          className="absolute h-20 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={pct(SCENE.plant.x, SCENE.plant.y - 40)}
        />
      </div>

      {/* ---- 我的世界 ---- */}
      <div className="pt-2 pb-6">
        <div className="px-5 pb-3">
          <h1 className="text-[19px] font-bold text-ink" data-testid="world-name">
            {worldName}
          </h1>
        </div>

        <EnergyPanel
          todayEnergy={todayEnergy}
          milestone={milestone}
          onCta={() => router.push(milestone.ctaHref)}
        />

        {pendingInitiativeDay === day ? (
          <div className="mt-3 px-5">
            <InitiativePrompt day={day} />
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-center gap-4 px-5">
          <button
            type="button"
            data-testid="world-to-history"
            onClick={() => router.push("/history")}
            className="tap-target text-[13px] text-ink-soft underline decoration-sand decoration-2 underline-offset-4"
          >
            我的成长轨迹
          </button>
          <span className="text-ink-faint" aria-hidden>
            ·
          </span>
          <button
            type="button"
            data-testid="world-to-plant"
            onClick={() => router.push("/plant")}
            className="tap-target text-[13px] text-ink-soft underline decoration-sand decoration-2 underline-offset-4"
          >
            看看成长植物
          </button>
        </div>
      </div>
    </div>
  );
}
