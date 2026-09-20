"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { EnergyPanel } from "@/components/growth/EnergyPanel";
import { InitiativePrompt } from "@/components/onboarding/InitiativePrompt";
import { IconChevronRight, IconSprout, IconSun } from "@/components/ui/icons";
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
      {/* ---- World ---- */}
      <div className="relative shrink-0" data-testid="world-area">
        <div className="flex items-start justify-between px-5 pt-6 pb-1">
          <button
            type="button"
            data-testid="day-badge"
            onClick={() => router.push("/history")}
            className="tap-target flex-col items-start rounded-2xl border border-sand-deep/40 bg-white/70 px-3.5 py-2 shadow-soft backdrop-blur-sm"
          >
            <span className="text-[15px] leading-none font-bold text-ink">Day {day}</span>
            <span className="mt-1.5 text-[11px] leading-none text-ink-faint">
              一起成长的第 {day} 天
            </span>
          </button>
          <span
            className="chip mt-1 h-8 w-8 bg-white/70 text-growth shadow-soft"
            aria-hidden
          >
            <IconSun size={17} />
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

        {/* Soft scrim so the scene melts into the page instead of ending abruptly. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent to-cream"
          aria-hidden
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
      <div className="relative -mt-2 pb-7">
        <div className="flex items-center gap-2 px-5 pb-4">
          <span className="chip h-7 w-7 bg-leaf-wash text-leaf-deep" aria-hidden>
            <IconSprout size={16} />
          </span>
          <h1 className="t-title text-ink" data-testid="world-name">
            {worldName}
          </h1>
        </div>

        <EnergyPanel
          todayEnergy={todayEnergy}
          milestone={milestone}
          onCta={() => router.push(milestone.ctaHref)}
        />

        {pendingInitiativeDay === day ? (
          <div className="mt-4 px-5">
            <InitiativePrompt day={day} />
          </div>
        ) : null}

        <div className="mt-5 flex gap-2.5 px-5">
          <button
            type="button"
            data-testid="world-to-history"
            onClick={() => router.push("/history")}
            className="tap-target flex-1 gap-1 rounded-button border border-sand-deep/40 bg-white/70 px-3 py-2.5 text-[13px] font-medium text-ink-soft shadow-soft"
          >
            我的成长轨迹
            <IconChevronRight size={15} className="text-ink-faint" />
          </button>
          <button
            type="button"
            data-testid="world-to-plant"
            onClick={() => router.push("/plant")}
            className="tap-target flex-1 gap-1 rounded-button border border-sand-deep/40 bg-white/70 px-3 py-2.5 text-[13px] font-medium text-ink-soft shadow-soft"
          >
            成长植物
            <IconChevronRight size={15} className="text-ink-faint" />
          </button>
        </div>
      </div>
    </div>
  );
}
