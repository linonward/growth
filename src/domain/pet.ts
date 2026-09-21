import { clampDay } from "./constants";
import type { PetState } from "./types";

/** Growth order, weakest -> strongest. Index doubles as the "rank" of a state. */
export const PET_STATE_ORDER: readonly PetState[] = [
  "egg",
  "wiggling_egg",
  "cracked_egg",
  "baby",
  "young",
  "evolved",
] as const;

/** Minimum total energy required to reach the state at the same index. */
export const PET_ENERGY_THRESHOLDS: readonly number[] = [
  0, 10, 30, 60, 120, 180,
] as const;

/**
 * Day Gate: the strongest visual state allowed on a given day, regardless of
 * how much energy the student earned.
 *
 * Without this a high-completion student would see the whole story on Day 1 and
 * the experiment could not measure whether they come back on Day 2.
 */
export const PET_DAY_CAP: Readonly<Record<number, PetState>> = {
  1: "wiggling_egg",
  2: "cracked_egg",
  3: "baby",
  4: "baby",
  5: "young",
  6: "young",
  7: "evolved",
} as const;

export const PET_STATE_LABELS: Readonly<Record<PetState, string>> = {
  egg: "安静的蛋",
  wiggling_egg: "蛋在轻轻晃动",
  cracked_egg: "蛋壳出现了裂缝",
  baby: "刚出生的小家伙",
  young: "长大了一点",
  evolved: "成长形态",
};

/** Strongest state the energy alone would allow (ignores the Day Gate). */
function stateFromEnergy(totalEnergy: number): PetState {
  const energy = Math.max(0, totalEnergy);
  let index = 0;
  for (let i = 0; i < PET_ENERGY_THRESHOLDS.length; i += 1) {
    if (energy >= PET_ENERGY_THRESHOLDS[i]) index = i;
  }
  return PET_STATE_ORDER[index];
}

/** The Day Gate ceiling for a given day. */
function stateCapForDay(day: number, todayEnergy: number): PetState {
  const cap = PET_DAY_CAP[clampDay(day)] ?? "egg";
  // Day 7's finale is earned by acting that day: spec section 11 plays the
  // three events "after completing the final task". A perfect student arrives
  // on Day 7 with exactly 180 energy, so without this they would see the whole
  // finale at the day rollover and never get the moment.
  //
  // Note the state is still `min(energy, cap)`, so this only matters to a
  // student who has actually reached 180 — the ending is available to every
  // completion rate through the world gate (`finaleEarned`), not by handing out
  // pet states the energy ladder did not earn. Showing a child a fully grown
  // pet they did not grow would contradict the one line the whole screen is
  // built on: 这一切都来自你现实里的成长.
  if (cap === "evolved" && todayEnergy <= 0) return "young";
  return cap;
}

/**
 * Resolve the pet's visual state.
 *
 * The result is the weaker of "what the energy earned" and "what the day
 * allows", so Day 1 can never hatch and Day 7 can never be reached early.
 *
 * `todayEnergy` only matters on the final day, where it gates the finale.
 */
export function getPetState(day: number, totalEnergy: number, todayEnergy = 0): PetState {
  const earnedIndex = PET_STATE_ORDER.indexOf(stateFromEnergy(totalEnergy));
  const capIndex = PET_STATE_ORDER.indexOf(stateCapForDay(day, todayEnergy));
  return PET_STATE_ORDER[Math.min(earnedIndex, capIndex)];
}

/** True once the egg has hatched into a visible creature. */
export function isPetBorn(state: PetState): boolean {
  return PET_STATE_ORDER.indexOf(state) >= PET_STATE_ORDER.indexOf("baby");
}

/**
 * Energy still required before the pet can change again.
 *
 * Returns `null` when the pet is already at the strongest state its current day
 * allows — the caller should then talk about tomorrow instead of a number.
 */
export function energyToNextPetState(
  day: number,
  totalEnergy: number,
  todayEnergy = 0,
): { next: PetState; remaining: number } | null {
  const currentIndex = PET_STATE_ORDER.indexOf(
    getPetState(day, totalEnergy, todayEnergy),
  );
  const capIndex = PET_STATE_ORDER.indexOf(stateCapForDay(day, todayEnergy));
  for (let i = currentIndex + 1; i < PET_STATE_ORDER.length; i += 1) {
    // Anything past today's ceiling is a tomorrow conversation, not a number.
    if (i > capIndex) return null;
    const needed = PET_ENERGY_THRESHOLDS[i];
    if (totalEnergy < needed) {
      return { next: PET_STATE_ORDER[i], remaining: needed - totalEnergy };
    }
  }
  return null;
}
