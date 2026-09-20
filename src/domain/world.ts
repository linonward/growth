import { clampDay } from "./constants";
import type { WorldState } from "./types";

/**
 * Which scenery exists in the world.
 *
 * Section 11 of the spec is the script: Day 1 wakes the sky and drops a rock,
 * Day 4 adds the first flower and a butterfly, Day 6 reveals the mystery gate
 * (and deliberately never opens it), Day 7 opens the new area.
 *
 * `todayEnergy` only matters on Day 7, where the new area must be earned by
 * completing one of that day's goals rather than by arriving with 180 energy.
 */
export function getWorldState(
  day: number,
  totalEnergy: number,
  todayEnergy = 0,
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
    // The finale needs the day, the energy that Day 7 implies, AND Day 7 action.
    newAreaUnlocked: d >= 7 && energy >= 180 && Math.max(0, todayEnergy) > 0,
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
