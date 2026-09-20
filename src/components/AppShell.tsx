"use client";

import type { ReactNode } from "react";

import { DebugPanel } from "@/components/debug/DebugPanel";
import { BottomNav } from "@/components/navigation/BottomNav";
import { DayStartOverlay } from "@/components/onboarding/DayStartOverlay";
import { FinaleOverlay } from "@/components/onboarding/FinaleOverlay";
import { FirstRunOverlay } from "@/components/onboarding/FirstRunOverlay";
import { RewardOverlay } from "@/components/reward/RewardOverlay";
import { useHydrateStore } from "@/store/hooks";
import { usePrototypeStore } from "@/store/prototype-store";

/**
 * The single client shell around every route.
 *
 * It owns store hydration and all full-screen moments (first run, day rollover,
 * reward, Day 7 finale, debug panel) so individual pages stay presentational.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const ready = useHydrateStore();
  const hasCompletedFirstRun = usePrototypeStore((s) => s.hasCompletedFirstRun);

  const showFirstRun = ready && !hasCompletedFirstRun;

  return (
    <div className="app-frame">
      <main className="flex min-h-0 flex-1 flex-col">
        {ready ? children : <BootSplash />}
      </main>

      {ready && !showFirstRun ? <BottomNav /> : null}

      {showFirstRun ? <FirstRunOverlay /> : null}
      <DayStartOverlay />
      <RewardOverlay />
      <FinaleOverlay />
      <DebugPanel />
    </div>
  );
}

/** First paint placeholder. Identical on the server and client, so hydration is stable. */
function BootSplash() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="animate-pulse text-center">
        <div className="text-[40px]" aria-hidden>
          🌱
        </div>
        <p className="mt-3 text-[13px] text-ink-faint">正在打开你的世界…</p>
      </div>
    </div>
  );
}
