"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { appendEvent } from "@/analytics/events";
import { buildExportPayload, type ExperimentExport } from "@/analytics/export";
import { getParticipantId } from "@/analytics/participant";
import {
  flushEvents,
  installFlushListeners,
  persistEvents,
  readEvents,
} from "@/analytics/persistence";
import { setActiveAgeBand } from "@/analytics/properties";
import {
  registerEventSink,
  trackContinueRequested,
  trackDay7Completed,
  trackDayCompleted,
  trackExperimentStarted,
  trackGoalCompleted,
  trackGoalSelected,
  trackInitiativeAnswered,
  trackMilestoneViewed,
  trackSessionStarted,
} from "@/analytics/track";
import { GOAL_TEMPLATES, getGoalTemplate } from "@/data/goals";
import {
  DEFAULT_PET_NAME,
  DEFAULT_WORLD_NAME,
  ENERGY_PER_GOAL,
  MAX_GOALS_PER_DAY,
  MAX_TOTAL_ENERGY,
  STORAGE_KEY,
} from "@/domain/constants";
import {
  calendarDayFromStart,
  energyFromCompletedGoals,
  getGrowthState,
} from "@/domain/growth";
import { getNextMilestone, type NextMilestone } from "@/domain/milestone";
import { describeRewardChange, detectDayMilestone } from "@/domain/reward";
import type {
  AgeBand,
  AnalyticsEvent,
  DailyCheckIn,
  DailyGoal,
  GoalTemplate,
  PetSpecies,
  RewardMoment,
  UserProfile,
} from "@/domain/types";

export interface PrototypeStoreState {
  // ---- persisted ----
  hasCompletedFirstRun: boolean;
  profile: UserProfile;
  currentDay: number;
  /** Debug-only override that wins over the calendar day. */
  dayOverride: number | null;
  /** Debug-only energy nudge, on top of the energy earned from real goals. */
  debugEnergyDelta: number;
  lastSeenDay: number | null;
  goalsByDay: Record<number, DailyGoal[]>;
  checkIns: DailyCheckIn[];
  seenMilestoneIds: string[];
  /** True once the student has explicitly confirmed the pet's name. */
  hasNamedPet: boolean;
  day7Completed: boolean;
  continueRequested: boolean;
  events: AnalyticsEvent[];

  // ---- transient (never persisted) ----
  hasHydrated: boolean;
  activeReward: RewardMoment | null;
  activeFinale: boolean;
  pendingDayStart: number | null;
  pendingInitiativeDay: number | null;

  // ---- actions ----
  setHydrated: (value: boolean) => void;
  /** Adopt the analytics log loaded from its own storage key. */
  setEvents: (events: AnalyticsEvent[]) => void;
  completeFirstRun: (input: {
    worldName?: string;
    petName?: string;
    petSpecies?: PetSpecies;
    now?: Date;
  }) => void;
  /**
   * Record the participant's age band. Called by the experimenter, never by the
   * student, and it survives a prototype reset for the same reason the
   * participant id does: it describes who is taking part, not their progress.
   */
  setAgeBand: (band: AgeBand | null) => void;
  renamePet: (name: string) => void;
  renameWorld: (name: string) => void;
  selectGoals: (day: number, templateIds: string[]) => void;
  completeGoal: (goalId: string) => void;
  dismissReward: () => void;
  dismissFinale: () => void;
  /** Re-arms the Day 7 finale if the student never got to see it. */
  resumeFinaleIfNeeded: () => void;
  answerInitiative: (day: number, value: "self" | "prompted") => void;
  recordDayOpened: (day: number) => void;
  syncDay: (now?: Date) => void;
  dismissDayStart: () => void;
  requestContinue: () => void;
  markMilestoneSeen: (id: string) => void;
  buildExport: () => ExperimentExport;
  // debug
  debugSetDay: (day: number) => void;
  debugAdjustEnergy: (delta: number) => void;
  debugTriggerReward: () => void;
  debugTriggerDay7Event: () => void;
  resetPrototype: () => void;
}

function defaultProfile(now = new Date()): UserProfile {
  return {
    worldName: DEFAULT_WORLD_NAME,
    petName: DEFAULT_PET_NAME,
    petSpecies: "fox",
    startedAt: now.toISOString(),
    // Unrecorded until the experimenter sets it. Never inferred from anything:
    // a guessed age band is worse than a missing one, because it silently
    // creates a cohort that the study did not recruit.
    ageBand: null,
  };
}

function initialPersistedState() {
  const now = new Date();
  return {
    hasCompletedFirstRun: false,
    profile: defaultProfile(now),
    currentDay: 1,
    dayOverride: null as number | null,
    debugEnergyDelta: 0,
    lastSeenDay: null as number | null,
    goalsByDay: {} as Record<number, DailyGoal[]>,
    checkIns: [] as DailyCheckIn[],
    seenMilestoneIds: [] as string[],
    hasNamedPet: false,
    day7Completed: false,
    continueRequested: false,
    events: [] as AnalyticsEvent[],
  };
}

/** Build the DailyGoal records for one day from template ids. */
function makeGoals(day: number, templateIds: readonly string[]): DailyGoal[] {
  return templateIds
    .slice(0, MAX_GOALS_PER_DAY)
    .filter((id) => getGoalTemplate(id) !== undefined)
    .map((templateId) => ({
      id: `d${day}-${templateId}`,
      day,
      templateId,
      completed: false,
    }));
}

// ---------------------------------------------------------------------------
// Selectors. Pages must read derived values through these, never recompute.
// ---------------------------------------------------------------------------

function allGoals(state: PrototypeStoreState): DailyGoal[] {
  return Object.values(state.goalsByDay).flat();
}

export function selectCompletedGoalCount(state: PrototypeStoreState): number {
  return allGoals(state).filter((g) => g.completed).length;
}

export function selectTotalEnergy(state: PrototypeStoreState): number {
  const earned = energyFromCompletedGoals(selectCompletedGoalCount(state));
  const total = earned + state.debugEnergyDelta;
  return Math.min(MAX_TOTAL_ENERGY, Math.max(0, total));
}

/** Stable empty array so selectors never hand React a fresh reference. */
const EMPTY_GOALS: DailyGoal[] = [];

export function selectTodayGoals(state: PrototypeStoreState): DailyGoal[] {
  return state.goalsByDay[state.currentDay] ?? EMPTY_GOALS;
}

export function selectTodayCompletedCount(state: PrototypeStoreState): number {
  return selectTodayGoals(state).filter((g) => g.completed).length;
}

export function selectTodayEnergy(state: PrototypeStoreState): number {
  return selectTodayCompletedCount(state) * ENERGY_PER_GOAL;
}

export function selectGrowth(state: PrototypeStoreState) {
  return getGrowthState(
    state.currentDay,
    selectTotalEnergy(state),
    selectTodayEnergy(state),
  );
}

export function selectNextMilestone(state: PrototypeStoreState): NextMilestone {
  return getNextMilestone({
    day: state.currentDay,
    totalEnergy: selectTotalEnergy(state),
    todayEnergy: selectTodayEnergy(state),
    selectedGoalCount: selectTodayGoals(state).length,
    completedTodayCount: selectTodayCompletedCount(state),
    day7Completed: state.day7Completed,
    petName: state.profile.petName,
  });
}

/** Completed-goal counts per goal category, for the plant page. */
export function selectCategoryCounts(state: PrototypeStoreState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const goal of allGoals(state)) {
    if (!goal.completed) continue;
    counts[goal.templateId] = (counts[goal.templateId] ?? 0) + 1;
  }
  return counts;
}

export function selectAvailableTemplates(): readonly GoalTemplate[] {
  return GOAL_TEMPLATES;
}

export const usePrototypeStore = create<PrototypeStoreState>()(
  persist(
    (set, get) => ({
      ...initialPersistedState(),

      hasHydrated: false,
      activeReward: null,
      activeFinale: false,
      pendingDayStart: null,
      pendingInitiativeDay: null,

      setHydrated: (value) => set({ hasHydrated: value }),

      setEvents: (events) => set({ events }),

      completeFirstRun: ({ worldName, petName, petSpecies, now } = {}) => {
        const at = now ?? new Date();
        set((state) => ({
          hasCompletedFirstRun: true,
          profile: {
            ...state.profile,
            worldName: worldName?.trim() || DEFAULT_WORLD_NAME,
            petName: petName?.trim() || DEFAULT_PET_NAME,
            petSpecies: petSpecies ?? state.profile.petSpecies,
            startedAt: at.toISOString(),
          },
          currentDay: 1,
          lastSeenDay: 1,
          pendingDayStart: null,
        }));
        trackExperimentStarted({
          day: 1,
          petSpecies: petSpecies ?? "fox",
          worldNameSet: Boolean(worldName?.trim()),
        });
      },

      setAgeBand: (band) => {
        // Push to the analytics layer first so the very next event already
        // carries it (the picker is used during device setup, before the child
        // touches anything).
        setActiveAgeBand(band);
        set((state) => ({ profile: { ...state.profile, ageBand: band } }));
      },

      renamePet: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => ({
          profile: { ...state.profile, petName: trimmed },
          hasNamedPet: true,
        }));
      },

      renameWorld: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => ({ profile: { ...state.profile, worldName: trimmed } }));
      },

      selectGoals: (day, templateIds) => {
        const state = get();
        const existing = state.goalsByDay[day] ?? [];
        // Once a goal is done the day is locked in — this keeps the record honest.
        if (existing.some((g) => g.completed)) return;
        const goals = makeGoals(day, templateIds);
        set({ goalsByDay: { ...state.goalsByDay, [day]: goals } });
        for (const goal of goals) {
          trackGoalSelected({ day, goalType: goal.templateId });
        }
      },

      completeGoal: (goalId) => {
        const state = get();
        const day = state.currentDay;
        const goals = state.goalsByDay[day] ?? [];
        const goal = goals.find((g) => g.id === goalId);
        if (!goal) return;
        // A goal can only be completed once — re-taps are ignored entirely.
        if (goal.completed) return;

        const beforeEnergy = selectTotalEnergy(state);
        const completedBefore = goals.filter((g) => g.completed).length;

        const completedAt = new Date().toISOString();
        const nextGoals = goals.map((g) =>
          g.id === goalId ? { ...g, completed: true, completedAt } : g,
        );

        const afterEnergy = Math.max(
          0,
          Math.min(
            MAX_TOTAL_ENERGY,
            energyFromCompletedGoals(selectCompletedGoalCount(state) + 1) +
              state.debugEnergyDelta,
          ),
        );

        const todayEnergyAfter = (completedBefore + 1) * ENERGY_PER_GOAL;

        const change = describeRewardChange(
          day,
          beforeEnergy,
          state.profile.petName,
          todayEnergyAfter,
        );
        const milestone = detectDayMilestone(
          day,
          beforeEnergy,
          state.profile.petName,
          todayEnergyAfter,
        );

        const reward: RewardMoment = {
          goalId,
          templateId: goal.templateId,
          day,
          change,
          milestone,
          isFinale: milestone?.id === "day7_finale",
          totalEnergyAfter: afterEnergy,
          todayEnergyAfter,
        };

        // Spec section 15: ask the initiative question after the day's first
        // completion, and only once per day.
        const checkIn = state.checkIns.find((c) => c.day === day);
        const shouldAskInitiative =
          completedBefore === 0 && checkIn?.initiative === undefined;

        set({
          goalsByDay: { ...state.goalsByDay, [day]: nextGoals },
          activeReward: reward,
          pendingInitiativeDay: shouldAskInitiative ? day : state.pendingInitiativeDay,
        });

        const growthAfter = getGrowthState(
          day,
          reward.totalEnergyAfter,
          todayEnergyAfter,
        );
        trackGoalCompleted({
          day,
          goalType: goal.templateId,
          energyEarned: ENERGY_PER_GOAL,
          petState: growthAfter.petState,
          plantState: growthAfter.plantState,
          totalEnergy: reward.totalEnergyAfter,
        });
        if (milestone) {
          trackMilestoneViewed({ day, milestoneId: milestone.id });
        }
        // Day-level completion is its own event: it is the retention signal,
        // separate from any individual goal.
        if (completedBefore + 1 === nextGoals.length) {
          trackDayCompleted({
            day,
            goalsCompleted: nextGoals.length,
            energyEarned: todayEnergyAfter,
          });
        }
      },

      dismissReward: () => {
        const reward = get().activeReward;
        set({ activeReward: null });
        // Day 7 chains straight into the three-beat finale sequence.
        if (reward?.isFinale) {
          set({ activeFinale: true });
        }
      },

      dismissFinale: () => {
        const state = get();
        if (!state.day7Completed) {
          const current = get();
          set({ activeFinale: false, day7Completed: true });
          trackDay7Completed({
            day: current.currentDay,
            totalEnergy: selectTotalEnergy(current),
          });
        } else {
          set({ activeFinale: false });
        }
      },

      resumeFinaleIfNeeded: () => {
        const state = get();
        if (state.day7Completed || state.activeFinale) return;
        // The finale is transient UI state, so a student who closed the app
        // mid-flow would otherwise never see the week's climax.
        if (selectGrowth(state).worldState.newAreaUnlocked) {
          set({ activeFinale: true });
        }
      },

      answerInitiative: (day, value) => {
        set((state) => {
          const exists = state.checkIns.some((c) => c.day === day);
          const checkIns = exists
            ? state.checkIns.map((c) => (c.day === day ? { ...c, initiative: value } : c))
            : [
                ...state.checkIns,
                { day, initiative: value, openedAt: new Date().toISOString() },
              ];
          return {
            checkIns,
            pendingInitiativeDay:
              state.pendingInitiativeDay === day ? null : state.pendingInitiativeDay,
          };
        });
        trackInitiativeAnswered({ day, initiative: value });
      },

      recordDayOpened: (day) => {
        set((state) => {
          const exists = state.checkIns.some((c) => c.day === day);
          const checkIns = exists
            ? state.checkIns
            : [
                ...state.checkIns,
                { day, openedAt: new Date().toISOString() } as DailyCheckIn,
              ];
          return { checkIns };
        });
        trackSessionStarted({ day });
      },

      syncDay: (now = new Date()) => {
        const state = get();
        const calendar = calendarDayFromStart(state.profile.startedAt, now);
        const next = state.dayOverride ?? calendar;

        if (state.lastSeenDay === null) {
          set({ currentDay: next, lastSeenDay: next });
          return;
        }
        if (next === state.lastSeenDay) {
          if (next !== state.currentDay) set({ currentDay: next });
          return;
        }

        const rolled = next > state.lastSeenDay;
        set({
          currentDay: next,
          lastSeenDay: next,
          // Day 2+ gets the gentle "something changed overnight" welcome.
          pendingDayStart: rolled && next > 1 ? next : null,
        });
      },

      dismissDayStart: () => set({ pendingDayStart: null }),

      requestContinue: () => {
        const state = get();
        set({ continueRequested: true });
        trackContinueRequested({
          day: state.currentDay,
          totalEnergy: selectTotalEnergy(state),
        });
      },

      markMilestoneSeen: (id) => {
        set((state) =>
          state.seenMilestoneIds.includes(id)
            ? state
            : { seenMilestoneIds: [...state.seenMilestoneIds, id] },
        );
      },

      buildExport: () => {
        const state = get();
        return buildExportPayload({
          participantId: getParticipantId(),
          profile: state.profile,
          goalsByDay: state.goalsByDay,
          checkIns: state.checkIns,
          events: state.events,
          day7Completed: state.day7Completed,
          totalEnergy: selectTotalEnergy(state),
          currentDay: state.currentDay,
        });
      },

      debugSetDay: (day) => {
        const clamped = Math.min(7, Math.max(1, Math.floor(day)));
        set({
          dayOverride: clamped,
          currentDay: clamped,
          lastSeenDay: clamped,
        });
      },

      debugAdjustEnergy: (delta) => {
        set((state) => {
          const current = selectTotalEnergy(state);
          const next = Math.min(MAX_TOTAL_ENERGY, Math.max(0, current + delta));
          const earned = energyFromCompletedGoals(selectCompletedGoalCount(state));
          return { debugEnergyDelta: next - earned };
        });
      },

      debugTriggerReward: () => {
        const state = get();
        const day = state.currentDay;
        // Make sure there is something to complete.
        if ((state.goalsByDay[day] ?? []).length === 0) {
          get().selectGoals(
            day,
            GOAL_TEMPLATES.slice(0, MAX_GOALS_PER_DAY).map((t) => t.id),
          );
        }
        const goals = get().goalsByDay[day] ?? [];
        const next = goals.find((g) => !g.completed);
        if (next) {
          get().completeGoal(next.id);
          return;
        }
        // Everything is already done — still demo the reward animation by
        // nudging the energy and synthesising the moment.
        const beforeEnergy = selectTotalEnergy(get());
        if (beforeEnergy >= MAX_TOTAL_ENERGY) return;
        get().debugAdjustEnergy(ENERGY_PER_GOAL);
        const change = describeRewardChange(
          day,
          beforeEnergy,
          state.profile.petName,
          selectTodayEnergy(get()),
        );
        const milestone = detectDayMilestone(
          day,
          beforeEnergy,
          state.profile.petName,
          selectTodayEnergy(get()),
        );
        set({
          activeReward: {
            goalId: `debug-${Date.now()}`,
            templateId: goals[0]?.templateId ?? "reading",
            day,
            change,
            milestone,
            isFinale: milestone?.id === "day7_finale",
            totalEnergyAfter: beforeEnergy + ENERGY_PER_GOAL,
            todayEnergyAfter: selectTodayEnergy(get()),
          },
        });
      },

      debugTriggerDay7Event: () => {
        // Park at Day 7 with 170 energy so one more goal crosses the threshold.
        set({ dayOverride: 7, currentDay: 7, lastSeenDay: 7, pendingDayStart: null });
        if ((get().goalsByDay[7] ?? []).length === 0) {
          get().selectGoals(
            7,
            GOAL_TEMPLATES.slice(0, MAX_GOALS_PER_DAY).map((t) => t.id),
          );
        }
        const completedCount = selectCompletedGoalCount(get());
        set({ debugEnergyDelta: 170 - energyFromCompletedGoals(completedCount) });

        const goal = (get().goalsByDay[7] ?? []).find((g) => !g.completed);
        if (goal) {
          get().completeGoal(goal.id);
          return;
        }
        // Nothing left to complete — force the finale state outright.
        set({
          debugEnergyDelta: 180 - energyFromCompletedGoals(completedCount),
          activeFinale: true,
        });
      },

      resetPrototype: () => {
        const now = new Date();
        // The experiment log is intentionally preserved across a reset: the
        // debug button is easy to hit by accident, and losing collected data
        // would be worse than carrying a few extra days of history.
        set((state) => ({
          ...initialPersistedState(),
          // Keep who they are, but put the world back to Day 1. The local event
          // log is deliberately preserved — losing collected data would be
          // worse than carrying a few extra days of history.
          hasCompletedFirstRun: state.hasCompletedFirstRun,
          profile: { ...state.profile, startedAt: now.toISOString() },
          events: state.events,
        }));
        // `profile` carries the age band through the reset (`initialPersistedState`
        // would have blanked it), but the analytics layer holds its own copy —
        // re-push it or every event after a reset would lose the band.
        setActiveAgeBand(get().profile.ageBand ?? null);
      },
    }),
    {
      name: STORAGE_KEY,
      /**
       * localStorage throws in Safari private mode, when the user has disabled
       * it, and when the quota is exceeded. Persisting the prototype must never
       * take the app down with it, so every access is guarded.
       */
      storage: createJSONStorage(() => ({
        getItem: (name: string) => {
          try {
            return localStorage.getItem(name);
          } catch {
            return null;
          }
        },
        setItem: (name: string, value: string) => {
          try {
            localStorage.setItem(name, value);
          } catch {
            // ignore: quota or disabled storage
          }
        },
        removeItem: (name: string) => {
          try {
            localStorage.removeItem(name);
          } catch {
            // ignore
          }
        },
      })),
      // The app is fully client-rendered from localStorage, so hydration is
      // triggered explicitly on mount to keep SSR output stable.
      skipHydration: true,
      version: 1,
      migrate: (persisted, from) => {
        // v0 stored the analytics log inside the main state. It is moved to its
        // own key during hydration; dropping it here keeps the two in step.
        const state = persisted as Record<string, unknown> | undefined;
        if (from < 1 && state && "events" in state) {
          delete state.events;
        }
        return state as never;
      },
      partialize: (state) => ({
        hasCompletedFirstRun: state.hasCompletedFirstRun,
        profile: state.profile,
        currentDay: state.currentDay,
        dayOverride: state.dayOverride,
        debugEnergyDelta: state.debugEnergyDelta,
        lastSeenDay: state.lastSeenDay,
        goalsByDay: state.goalsByDay,
        checkIns: state.checkIns,
        seenMilestoneIds: state.seenMilestoneIds,
        hasNamedPet: state.hasNamedPet,
        day7Completed: state.day7Completed,
        continueRequested: state.continueRequested,
        // `events` is deliberately NOT persisted here. It lives in its own key
        // (see analytics/persistence.ts) because it dominated every write.
      }),
    },
  ),
);

/*
 * Analytics persistence.
 *
 * Wired up here rather than in a React effect on purpose: the event log should
 * be written whether or not a component happens to be mounted, and this way the
 * tests exercise exactly the same path the app does.
 *
 * `events` is deliberately absent from `partialize`, so the game-state key stays
 * small; the log is batched into ANALYTICS_KEY by persistEvents().
 */
installFlushListeners();
usePrototypeStore.subscribe((state, prev) => {
  if (state.events !== prev.events) persistEvents(state.events);
});

// The trackers own the wire format; this keeps the local log (used by
// /debug/export and the offline JSON) in step without importing the store from
// the analytics layer, which would be a cycle.
registerEventSink((event) => {
  usePrototypeStore.setState((state) => ({
    events: appendEvent(state.events, event),
  }));
});

/** Load the persisted analytics log into the store. Called once, on hydration. */
export function adoptPersistedEvents(): void {
  const store = usePrototypeStore.getState();
  const stored = readEvents();
  if (stored.length > 0) {
    store.setEvents(stored);
  } else if (store.events.length > 0) {
    // Migrating from the schema where the log lived in the game-state key.
    // Nothing changed, so the subscription above would not fire.
    persistEvents(store.events);
  }
}

/**
 * Re-publish the persisted age band to the analytics layer.
 *
 * Must run after `persist.rehydrate()`, before the first tracker fires: without
 * it, `experiment_started` and the Day 1 events would go out unsegmented even
 * though a band was recorded during setup. Same reason as `adoptPersistedEvents`
 * — the analytics layer has no store access by design.
 */
export function adoptAgeBand(): void {
  setActiveAgeBand(usePrototypeStore.getState().profile.ageBand ?? null);
}

export { flushEvents };
