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

/**
 * The analytics event log is stored separately from game state: it dominated
 * every write while it lived inside the main key (spec section 19 still only
 * requires it to survive until it is exported).
 */
export const ANALYTICS_KEY = "growth-world-analytics-v1";

/**
 * Anonymous participant UUID. Its own key so it survives a prototype reset —
 * a reset clears progress, not who the participant is.
 */
export const PARTICIPANT_KEY = "growth-world-participant-v1";

/** Force any day value into the 1..7 experiment window. */
export function clampDay(day: number): number {
  if (!Number.isFinite(day)) return 1;
  return Math.min(TOTAL_DAYS, Math.max(1, Math.floor(day)));
}

/**
 * Whether the Day 7 ending has been earned.
 *
 * Spec section 11 plays the closing beat — the mystery gate opening — when the
 * student completes the final task, and the point of that wording is that the
 * ending is earned by *acting on the final day*, not by arriving with a large
 * total.
 *
 * This is consulted by `getWorldState()` instead of an energy threshold. The
 * energy threshold it replaced required `totalEnergy >= 180`, i.e. six perfect
 * days, because the pet and plant ladders happen to top out at 180. That made
 * the last day a different experience per completion rate:
 *
 *   - 3 goals a day: the gate opened, the pet evolved and the tree bloomed
 *   - 1 goal a day: nothing happened at all, the gate promised on Day 6 stayed
 *     shut forever, and the home screen told the child the 7-day journey was
 *     "complete"
 *
 * which is the opposite of what this prototype is for (P5: doing less is never
 * punished). The pet and plant keep their energy ladders, so a child who did
 * less sees their *real* pet and tree — that is honest. The ending itself, the
 * thing the whole week promised, is now available to everyone who shows up and
 * acts on the last day.
 *
 * The first five days of Day Gate throttling are untouched: they are what makes
 * "will they come back tomorrow" measurable.
 */
export function finaleEarned(day: number, todayEnergy: number): boolean {
  return clampDay(day) >= TOTAL_DAYS && Math.max(0, todayEnergy) > 0;
}
