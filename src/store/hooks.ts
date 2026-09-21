"use client";

import { useEffect, useMemo } from "react";

import { initAnalytics } from "@/analytics/client";
import { getParticipantId } from "@/analytics/participant";
import { ENERGY_PER_GOAL, MAX_TOTAL_ENERGY } from "@/domain/constants";
import { energyFromCompletedGoals, getGrowthState } from "@/domain/growth";
import { getNextMilestone, type NextMilestone } from "@/domain/milestone";
import type { DailyGoal, GrowthState } from "@/domain/types";
import {
  adoptAgeBand,
  adoptPersistedEvents,
  usePrototypeStore,
} from "@/store/prototype-store";

/** Stable empty array so selectors never hand React a fresh reference. */
const EMPTY_GOALS: DailyGoal[] = [];

/**
 * Guards against React StrictMode's double effect invocation, which would
 * otherwise record two `app_opened` events per real app open.
 */
let hydrationStarted = false;

/**
 * Rehydrate the persisted store, roll the day over, and record the app open.
 *
 * The store uses `skipHydration` so the server and the client both render the
 * same "not ready yet" state, which keeps hydration stable while all real data
 * lives in localStorage.
 */
export function useHydrateStore(): boolean {
  const hasHydrated = usePrototypeStore((s) => s.hasHydrated);

  useEffect(() => {
    if (hydrationStarted) return;
    hydrationStarted = true;

    // Deliberately not cancelled on cleanup: the store is a module singleton,
    // not component state. React StrictMode mounts, cleans up, then remounts,
    // so a cancellation flag here would let the first pass abort and the second
    // pass skip — leaving the app stuck on the boot splash forever.
    void (async () => {
      try {
        await usePrototypeStore.persist.rehydrate();
      } catch {
        // Corrupt or unavailable storage: fall back to a fresh prototype.
      }
      const store = usePrototypeStore.getState();

      adoptPersistedEvents();
      // Publish the recorded age band before the first tracker fires, so even
      // the Day 1 events are attributable to an age group.
      adoptAgeBand();
      // Establish the anonymous identity first, and unconditionally: it must be
      // stable whether or not PostHog happens to be configured, and it is the
      // attribution key in the offline export.
      getParticipantId();
      // PostHog is ~50 KB, so it loads after hydration rather than blocking the
      // first paint. Without a key it resolves to null and every tracker is a
      // no-op; the local event log keeps working either way.
      void initAnalytics();

      store.setHydrated(true);
      store.syncDay();
      const afterSync = usePrototypeStore.getState();
      // Only count opens once the student has actually started the prototype.
      if (afterSync.hasCompletedFirstRun) {
        afterSync.recordDayOpened(afterSync.currentDay);
        // Re-show the Day 7 finale if it was earned but never watched.
        afterSync.resumeFinaleIfNeeded();
      }
    })();
  }, []);

  return hasHydrated;
}

/** Test hook: lets a reload re-run the hydration side effects. */
export function __resetHydrationGuard() {
  hydrationStarted = false;
}

// ---------------------------------------------------------------------------
// Derived-state hooks.
//
// zustand v5 reads through useSyncExternalStore, which requires the selected
// snapshot to be referentially stable. These hooks therefore select raw state
// and build derived objects in useMemo, rather than selecting fresh objects.
// ---------------------------------------------------------------------------

export function useCompletedGoalCount(): number {
  const goalsByDay = usePrototypeStore((s) => s.goalsByDay);
  return useMemo(
    () =>
      Object.values(goalsByDay)
        .flat()
        .filter((g) => g.completed).length,
    [goalsByDay],
  );
}

export function useTotalEnergy(): number {
  const completedCount = useCompletedGoalCount();
  const debugEnergyDelta = usePrototypeStore((s) => s.debugEnergyDelta);
  return useMemo(() => {
    const raw = energyFromCompletedGoals(completedCount) + debugEnergyDelta;
    return Math.min(MAX_TOTAL_ENERGY, Math.max(0, raw));
  }, [completedCount, debugEnergyDelta]);
}

export function useTodayGoals(): DailyGoal[] {
  const currentDay = usePrototypeStore((s) => s.currentDay);
  const goalsByDay = usePrototypeStore((s) => s.goalsByDay);
  return goalsByDay[currentDay] ?? EMPTY_GOALS;
}

export function useTodayEnergy(): number {
  const goals = useTodayGoals();
  return useMemo(
    () => goals.filter((g) => g.completed).length * ENERGY_PER_GOAL,
    [goals],
  );
}

export function useGrowth(): GrowthState {
  const currentDay = usePrototypeStore((s) => s.currentDay);
  const totalEnergy = useTotalEnergy();
  const todayEnergy = useTodayEnergy();
  // Selected rather than derived from energy: the star garden counts days that
  // had an action, and two different goal layouts can share a total energy.
  const goalsByDay = usePrototypeStore((s) => s.goalsByDay);
  const activeDays = useMemo(
    () =>
      Object.values(goalsByDay).filter((goals) => goals.some((g) => g.completed)).length,
    [goalsByDay],
  );
  return useMemo(
    () => getGrowthState(currentDay, totalEnergy, todayEnergy, activeDays),
    [currentDay, totalEnergy, todayEnergy, activeDays],
  );
}

export function useMilestone(): NextMilestone {
  const currentDay = usePrototypeStore((s) => s.currentDay);
  const day7Completed = usePrototypeStore((s) => s.day7Completed);
  const petName = usePrototypeStore((s) => s.profile.petName);
  const totalEnergy = useTotalEnergy();
  const todayEnergy = useTodayEnergy();
  const goals = useTodayGoals();

  return useMemo(
    () =>
      getNextMilestone({
        day: currentDay,
        totalEnergy,
        todayEnergy,
        selectedGoalCount: goals.length,
        completedTodayCount: goals.filter((g) => g.completed).length,
        day7Completed,
        petName,
      }),
    [currentDay, totalEnergy, todayEnergy, goals, day7Completed, petName],
  );
}

export function useCategoryCounts(): Record<string, number> {
  const goalsByDay = usePrototypeStore((s) => s.goalsByDay);
  return useMemo(() => {
    const counts: Record<string, number> = {};
    for (const goal of Object.values(goalsByDay).flat()) {
      if (!goal.completed) continue;
      counts[goal.templateId] = (counts[goal.templateId] ?? 0) + 1;
    }
    return counts;
  }, [goalsByDay]);
}
