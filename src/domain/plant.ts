import { clampDay } from "./constants";
import type { PlantState } from "./types";

/** Growth order, weakest -> strongest. */
export const PLANT_STATE_ORDER: readonly PlantState[] = [
  "seed",
  "sprout",
  "leaf",
  "young_plant",
  "bud",
  "tree",
  "bloom",
] as const;

/** Minimum total energy required to reach the state at the same index. */
export const PLANT_ENERGY_THRESHOLDS: readonly number[] = [
  0, 10, 30, 60, 90, 140, 180,
] as const;

/**
 * Day Gate ceiling per day.
 *
 * Day 4 keeps `young_plant` but adds the first flower as a separate world
 * change, which is how Day 4 stays interesting without evolving the pet.
 */
export const PLANT_DAY_CAP: Readonly<Record<number, PlantState>> = {
  1: "sprout",
  2: "leaf",
  3: "young_plant",
  4: "young_plant",
  5: "bud",
  6: "tree",
  7: "bloom",
} as const;

export const PLANT_STATE_LABELS: Readonly<Record<PlantState, string>> = {
  seed: "种子",
  sprout: "小芽",
  leaf: "新叶",
  young_plant: "小树苗",
  bud: "花苞",
  tree: "知识树",
  bloom: "开花的树",
};

/** Human-facing stage index used by the /plant page (1-based). */
export const PLANT_STAGE_NUMBER: Readonly<Record<PlantState, number>> = {
  seed: 1,
  sprout: 2,
  leaf: 3,
  young_plant: 4,
  bud: 5,
  tree: 6,
  bloom: 7,
};

function stateFromEnergy(totalEnergy: number): PlantState {
  const energy = Math.max(0, totalEnergy);
  let index = 0;
  for (let i = 0; i < PLANT_ENERGY_THRESHOLDS.length; i += 1) {
    if (energy >= PLANT_ENERGY_THRESHOLDS[i]) index = i;
  }
  return PLANT_STATE_ORDER[index];
}

function stateCapForDay(day: number, todayEnergy: number): PlantState {
  const cap = PLANT_DAY_CAP[clampDay(day)] ?? "seed";
  // Same Day 7 rule as the pet: the bloom is triggered by the final task.
  if (cap === "bloom" && todayEnergy <= 0) return "tree";
  return cap;
}

/**
 * Weaker of energy-earned state and the day ceiling.
 *
 * `todayEnergy` only matters on the final day, where it gates the bloom.
 */
export function getPlantState(
  day: number,
  totalEnergy: number,
  todayEnergy = 0,
): PlantState {
  const earnedIndex = PLANT_STATE_ORDER.indexOf(stateFromEnergy(totalEnergy));
  const capIndex = PLANT_STATE_ORDER.indexOf(stateCapForDay(day, todayEnergy));
  return PLANT_STATE_ORDER[Math.min(earnedIndex, capIndex)];
}

/**
 * Energy still required before the plant can grow again, or `null` when the
 * current day's ceiling has already been reached.
 */
export function energyToNextPlantState(
  day: number,
  totalEnergy: number,
  todayEnergy = 0,
): { next: PlantState; remaining: number } | null {
  const currentIndex = PLANT_STATE_ORDER.indexOf(
    getPlantState(day, totalEnergy, todayEnergy),
  );
  const capIndex = PLANT_STATE_ORDER.indexOf(stateCapForDay(day, todayEnergy));
  for (let i = currentIndex + 1; i < PLANT_STATE_ORDER.length; i += 1) {
    if (i > capIndex) return null;
    const needed = PLANT_ENERGY_THRESHOLDS[i];
    if (totalEnergy < needed) {
      return { next: PLANT_STATE_ORDER[i], remaining: needed - totalEnergy };
    }
  }
  return null;
}
