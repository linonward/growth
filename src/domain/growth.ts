import {
  clampDay,
  ENERGY_PER_GOAL,
  MAX_ENERGY_PER_DAY,
  MAX_GOALS_PER_DAY,
  MAX_TOTAL_ENERGY,
  TOTAL_DAYS,
} from "./constants";
import { EMPTY_MIX, type GrowthMix } from "./growth-mix";
import { energyToNextPetState, getPetState, PET_STATE_LABELS } from "./pet";
import { energyToNextPlantState, getPlantState, PLANT_STATE_LABELS } from "./plant";
import type { GrowthState } from "./types";
import { getWorldState } from "./world";

/**
 * Single source of truth for "what does the world look like right now".
 *
 * Every page calls this instead of scattering threshold logic through the UI
 * (spec section 17).
 *
 * `activeDays` is how many days the student completed at least one goal on. It
 * feeds only the star garden — the behaviour-driven axis that gives the world a
 * change on days when no energy threshold is crossed.
 */
export function getGrowthState(
  day: number,
  totalEnergy: number,
  todayEnergy: number,
  activeDays = 0,
  growthMix: GrowthMix = EMPTY_MIX,
): GrowthState {
  return {
    currentDay: clampDay(day),
    totalEnergy: Math.max(0, totalEnergy),
    todayEnergy: Math.max(0, todayEnergy),
    petState: getPetState(day, totalEnergy, todayEnergy),
    plantState: getPlantState(day, totalEnergy, todayEnergy),
    worldState: getWorldState(day, totalEnergy, todayEnergy, activeDays, growthMix),
  };
}

/**
 * Total energy derived from completed goals.
 *
 * Deriving instead of incrementing makes double-completion structurally
 * impossible and keeps reset trivially correct.
 */
export function energyFromCompletedGoals(completedGoalCount: number): number {
  return Math.max(0, Math.floor(completedGoalCount)) * ENERGY_PER_GOAL;
}

/** Today's energy can never exceed 3 goals x 10. */
export function clampTodayEnergy(todayEnergy: number): number {
  return Math.min(MAX_ENERGY_PER_DAY, Math.max(0, todayEnergy));
}

/** Progress as a 0..1 ratio for progress bars. */
export function todayEnergyRatio(todayEnergy: number): number {
  return clampTodayEnergy(todayEnergy) / MAX_ENERGY_PER_DAY;
}

/** The calendar day of the experiment, 1-based, clamped to the 7-day window. */
export function calendarDayFromStart(startedAt: string, now: Date): number {
  const start = new Date(startedAt);
  if (Number.isNaN(start.getTime())) return 1;
  const startMidnight = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
  );
  const nowMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = Math.floor((nowMidnight - startMidnight) / 86_400_000);
  return clampDay(diffDays + 1);
}

/** Whether the experiment window has run out. */
export function isFinalDay(day: number): boolean {
  return clampDay(day) >= TOTAL_DAYS;
}

export type { GrowthState };
/** Convenience re-exports so pages import growth concerns from one place. */
export {
  ENERGY_PER_GOAL,
  energyToNextPetState,
  energyToNextPlantState,
  MAX_ENERGY_PER_DAY,
  MAX_GOALS_PER_DAY,
  MAX_TOTAL_ENERGY,
  PET_STATE_LABELS,
  PLANT_STATE_LABELS,
};
