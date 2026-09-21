import { clampDay, finaleEarned, TOTAL_DAYS } from "./constants";
import type { WorldState } from "./types";

/**
 * How many days the student actually acted on.
 *
 * Behaviour, not calendar: a day counts only if at least one goal was completed
 * on it. Capped at the current day and at the length of the experiment, so a
 * data glitch can never make the garden outgrow the week.
 */
export function starsEarnedBy(day: number, activeDays: number): number {
  const d = clampDay(day);
  if (!Number.isFinite(activeDays)) return 0;
  return Math.min(d, TOTAL_DAYS, Math.max(0, Math.floor(activeDays)));
}

/**
 * Which scenery exists in the world.
 *
 * Section 11 of the spec is the script: Day 1 wakes the sky and drops a rock,
 * Day 4 adds the first flower and a butterfly, Day 6 reveals the mystery gate
 * (and deliberately never opens it), Day 7 opens the new area.
 *
 * Three of those are day-gated reveals that happen whether or not the child
 * does anything (flower, butterfly, gate) — principle P2, so the island still
 * changes for a child who comes back without completing a goal. Everything else
 * is behaviour-driven: `todayEnergy` for the finale, and `activeDays` for the
 * star garden.
 *
 * The garden is the second axis and it exists for a concrete reason: energy
 * arrives in steps of 10, so a child completing one goal a day crosses a pet or
 * plant threshold only every second or third day. On the days in between, the
 * only new things used to be the calendar reveals — the world looked as though
 * nothing they did mattered. One star per active day means every day the child
 * acts, the world changes, at any completion rate.
 *
 * See `finaleEarned()` for why the Day 7 ending does not require a full total.
 */
export function getWorldState(
  day: number,
  totalEnergy: number,
  todayEnergy = 0,
  activeDays = 0,
): WorldState {
  const d = clampDay(day);
  const energy = Math.max(0, totalEnergy);

  return {
    // Day 1 progressive detail: the sky brightens after the very first goal.
    skyGlow: energy >= 10,
    // Day 1 progressive detail: a small rock appears once the world has shape.
    rockUnlocked: energy >= 30 || d >= 2,
    // "Day 4 | 第一朵花". Purely day-gated so the island still visibly changes
    // for a student who returns but has not completed anything yet (principle P2).
    flowerUnlocked: d >= 4,
    butterflyUnlocked: d >= 4,
    mysteryGateUnlocked: d >= 6,
    // The finale needs the day AND an action on that day. Nothing else: a child
    // who completes one goal a day still gets the ending the week promised.
    newAreaUnlocked: finaleEarned(d, todayEnergy),
    starsEarned: starsEarnedBy(d, activeDays),
  };
}

/** Cloud count ramps up across the week so Day 1 never looks like Day 7. */
export function getCloudCount(day: number): number {
  const d = clampDay(day);
  if (d <= 1) return 0;
  if (d <= 2) return 1;
  if (d <= 4) return 2;
  return 3;
}

/** The mystery area never opens before Day 7, no matter how many goals are done. */
export function isMysteryGateOpen(
  day: number,
  totalEnergy: number,
  todayEnergy = 0,
): boolean {
  return getWorldState(day, totalEnergy, todayEnergy).newAreaUnlocked;
}
