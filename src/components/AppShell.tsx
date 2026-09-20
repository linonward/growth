"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { DebugPanel } from "@/components/debug/DebugPanel";
import { BottomNav } from "@/components/navigation/BottomNav";
import { RouteSkeleton } from "@/components/ui/Skeletons";
import { useHydrateStore } from "@/store/hooks";
import { usePrototypeStore } from "@/store/prototype-store";

/**
 * The full-screen moments are lazy-loaded so framer-motion (~136 KB) stays out
 * of the initial bundle. The world screen is the first thing every student
 * sees, so it must not pay for an animation library it does not use.
 *
 * Each of these is always mounted by the shell and decides internally whether
 * to render, so AnimatePresence exit animations still work.
 */
const DayStartOverlay = dynamic(
  () => import("@/components/onboarding/DayStartOverlay").then((m) => m.DayStartOverlay),
  { ssr: false },
);

const FinaleOverlay = dynamic(
  () => import("@/components/onboarding/FinaleOverlay").then((m) => m.FinaleOverlay),
  { ssr: false },
);

const FirstRunOverlay = dynamic(
  () => import("@/components/onboarding/FirstRunOverlay").then((m) => m.FirstRunOverlay),
  { ssr: false },
);

const RewardOverlay = dynamic(
  () => import("@/components/reward/RewardOverlay").then((m) => m.RewardOverlay),
  { ssr: false },
);

/**
 * The single client shell around every route.
 *
 * It owns store hydration and all full-screen moments (first run, day rollover,
 * reward, Day 7 finale, debug panel) so individual pages stay presentational.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const ready = useHydrateStore();
  const pathname = usePathname();
  const hasCompletedFirstRun = usePrototypeStore((s) => s.hasCompletedFirstRun);

  /*
   * A brand-new student must never see the world before the welcome.
   *
   * The overlays are lazily-loaded chunks, so rendering `children` as soon as
   * hydration finishes would paint the world for a moment and then cover it
   * with the first-run overlay. Gating the app on `hasCompletedFirstRun` (not
   * just on `ready`) keeps the skeleton up until onboarding takes over.
   */
  const showApp = ready && hasCompletedFirstRun;
  const showFirstRun = ready && !hasCompletedFirstRun;

  // Warm the remaining overlay chunks during idle time. They are needed within
  // seconds of the first interaction, so fetching them at the first quiet
  // moment keeps the bundle split without adding a visible delay later.
  useEffect(() => {
    if (!ready) return;
    const warm = () => {
      void import("@/components/onboarding/FirstRunOverlay");
      void import("@/components/reward/RewardOverlay");
      void import("@/components/onboarding/DayStartOverlay");
      void import("@/components/onboarding/FinaleOverlay");
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(warm, 1200);
    return () => clearTimeout(t);
  }, [ready]);

  return (
    <div className="app-frame">
      <main className="flex min-h-0 flex-1 flex-col">
        {showApp ? children : <RouteSkeleton pathname={pathname} />}
      </main>

      {/*
        The nav is rendered from the very first paint so the frame is complete
        immediately and nothing shifts when the data arrives. For a first-run
        student it is simply hidden behind the opaque onboarding overlay.
      */}
      <BottomNav />

      {showFirstRun ? <FirstRunOverlay /> : null}
      <DayStartOverlay />
      <RewardOverlay />
      <FinaleOverlay />
      <DebugPanel />
    </div>
  );
}
