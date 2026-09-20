/** Tunable Phase 0 constants. Everything else derives from these. */

/** Each completed real-world goal is worth this much growth energy. */
export const ENERGY_PER_GOAL = 10;

/** A student may pick at most 3 goals per day. */
export const MAX_GOALS_PER_DAY = 3;

/** 3 goals x 10 energy. */
export const MAX_ENERGY_PER_DAY = ENERGY_PER_GOAL * MAX_GOALS_PER_DAY;

/** The experiment runs for exactly 7 days. */
export const TOTAL_DAYS = 7;

/** 7 days x 30 energy. */
export const MAX_TOTAL_ENERGY = MAX_ENERGY_PER_DAY * TOTAL_DAYS;

export const DEFAULT_WORLD_NAME = "我的成长岛";
export const DEFAULT_PET_NAME = "小光";

export const STORAGE_KEY = "growth-world-prototype-v1";

/** Force any day value into the 1..7 experiment window. */
export function clampDay(day: number): number {
  if (!Number.isFinite(day)) return 1;
  return Math.min(TOTAL_DAYS, Math.max(1, Math.floor(day)));
}
