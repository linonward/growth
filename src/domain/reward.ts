import { ENERGY_PER_GOAL } from "./constants";
import { getPetState, PET_STATE_ORDER } from "./pet";
import { getPlantState, PLANT_STATE_ORDER } from "./plant";
import type { PetState, PlantState } from "./types";
import { getWorldState } from "./world";

/** Emoji used for the stage-3 "before -> after" morph. */
export const PET_EMOJI: Readonly<Record<PetState, string>> = {
  egg: "🥚",
  wiggling_egg: "🥚",
  cracked_egg: "🥚",
  baby: "🐣",
  young: "🦊",
  evolved: "🦊",
};

export const PLANT_EMOJI: Readonly<Record<PlantState, string>> = {
  seed: "🌰",
  sprout: "🌱",
  leaf: "🌿",
  young_plant: "🪴",
  bud: "🌱",
  tree: "🌳",
  bloom: "🌸",
};

export type RewardTarget = "pet" | "plant" | "world" | "energy";

export interface RewardChange {
  target: RewardTarget;
  /** True for scripted, once-a-week moments (pet birth, Day 7 finale). */
  isMajor: boolean;
  title: string;
  detail: string;
  from: string;
  to: string;
}

/**
 * Work out what the world change should be for one completed goal.
 *
 * Spec section 5: every task earns a small reward, but only some tasks earn a
 * big visual change. We prefer a real domain transition when one happens, and
 * otherwise fall back to a light "energy" reward so the sequence never repeats
 * the same beat twice in a row.
 */
export function describeRewardChange(
  day: number,
  beforeEnergy: number,
  petName = "小伙伴",
  todayEnergyAfter = ENERGY_PER_GOAL,
): RewardChange {
  const afterEnergy = beforeEnergy + ENERGY_PER_GOAL;
  // The Day 7 finale is gated on acting today, so the "before" view must use
  // the pre-completion day participation and the "after" view the post- one.
  const todayEnergyBefore = Math.max(0, todayEnergyAfter - ENERGY_PER_GOAL);

  const petBefore = getPetState(day, beforeEnergy, todayEnergyBefore);
  const petAfter = getPetState(day, afterEnergy, todayEnergyAfter);
  const plantBefore = getPlantState(day, beforeEnergy, todayEnergyBefore);
  const plantAfter = getPlantState(day, afterEnergy, todayEnergyAfter);

  // 0. Day 7's bloom is Event 1 of the finale (spec section 11), so it leads
  //    even though the pet also evolves on the very same goal.
  if (plantBefore !== "bloom" && plantAfter === "bloom") {
    return {
      target: "plant",
      isMajor: true,
      title: "知识树开花了！",
      detail: "7 天前，它还是一颗小小的芽。",
      from: PLANT_EMOJI[plantBefore],
      to: PLANT_EMOJI[plantAfter],
    };
  }

  // 1. Otherwise a pet transition wins — it is the strongest emotional beat.
  if (petBefore !== petAfter) {
    const born = petAfter === "baby";
    const evolved = petAfter === "evolved";
    return {
      target: "pet",
      isMajor: born || evolved,
      title: born
        ? "一个新的伙伴来到了你的世界！"
        : evolved
          ? `${petName}变成了成长形态！`
          : "蛋壳有了新的变化！",
      detail: born
        ? `它好像很喜欢这里。给它起个名字吧。`
        : evolved
          ? "因为你也一直在成长。"
          : "里面有东西在轻轻动。",
      from: PET_EMOJI[petBefore],
      to: PET_EMOJI[petAfter],
    };
  }

  // 2. Plant transition.
  if (plantBefore !== plantAfter) {
    const grewLeaves =
      PLANT_STATE_ORDER.indexOf(plantAfter) <= PLANT_STATE_ORDER.indexOf("leaf");
    return {
      target: "plant",
      isMajor: false,
      title: "成长植物长出了新叶子！",
      detail: grewLeaves ? "你每一次真实的成长，都变成了它的养分。" : "它又长高了一点。",
      from: PLANT_EMOJI[plantBefore],
      to: PLANT_EMOJI[plantAfter],
    };
  }

  // 3. Scenery transition.
  const worldBefore = getWorldState(day, beforeEnergy, todayEnergyBefore);
  const worldAfter = getWorldState(day, afterEnergy, todayEnergyAfter);
  if (!worldBefore.rockUnlocked && worldAfter.rockUnlocked) {
    return {
      target: "world",
      isMajor: false,
      title: "岛上出现了一块小石头。",
      detail: "世界比刚才更完整了一点。",
      from: "🌫️",
      to: "🪨",
    };
  }
  if (!worldBefore.flowerUnlocked && worldAfter.flowerUnlocked) {
    return {
      target: "world",
      isMajor: false,
      title: "岛上开出了第一朵花。",
      detail: "风把花香带到了小伙伴那里。",
      from: "🌿",
      to: "🌼",
    };
  }

  // 4. Always-available small reward: light + energy.
  return {
    target: "energy",
    isMajor: false,
    title: "成长能量流进了你的世界。",
    detail: SMALL_REWARDS[beforeEnergy % SMALL_REWARDS.length],
    from: "✨",
    to: "🌍",
  };
}

/** Rotating micro-copy so repeated small rewards do not feel copy-pasted. */
const SMALL_REWARDS = [
  "天空好像亮了一点点。",
  "云飘过来看了一眼。",
  "地上的草更绿了一些。",
] as const;

/**
 * Detect a day-level milestone worth a full-screen moment after a completion.
 *
 * Returned values are shown at reward stage 3 and recorded as `milestone_viewed`.
 *
 * Note the mystery gate is intentionally absent: it is revealed by the day
 * rolling over (Day 6), not by completing a goal, and it never opens that day.
 */
export function detectDayMilestone(
  day: number,
  beforeEnergy: number,
  petName = "小伙伴",
  todayEnergyAfter = ENERGY_PER_GOAL,
): { id: string; title: string; detail: string } | null {
  const afterEnergy = beforeEnergy + ENERGY_PER_GOAL;
  const todayEnergyBefore = Math.max(0, todayEnergyAfter - ENERGY_PER_GOAL);

  const petBeforeIdx = PET_STATE_ORDER.indexOf(
    getPetState(day, beforeEnergy, todayEnergyBefore),
  );
  const petAfterIdx = PET_STATE_ORDER.indexOf(
    getPetState(day, afterEnergy, todayEnergyAfter),
  );
  const worldBefore = getWorldState(day, beforeEnergy, todayEnergyBefore);
  const worldAfter = getWorldState(day, afterEnergy, todayEnergyAfter);

  if (
    petBeforeIdx < PET_STATE_ORDER.indexOf("baby") &&
    petAfterIdx >= PET_STATE_ORDER.indexOf("baby")
  ) {
    return {
      id: `day${day}_pet_born`,
      title: "一个新的伙伴来到了你的世界。",
      detail: `给它起个名字吧。默认叫「${petName}」。`,
    };
  }

  // Day 7's three-beat finale (plant bloom -> pet evolved -> new area) is owned
  // by the store so it can play as one continuous sequence.
  if (!worldBefore.newAreaUnlocked && worldAfter.newAreaUnlocked) {
    return {
      id: "day7_finale",
      title: "门后的世界打开了。",
      detail: "7 天前，这里只有一颗蛋和一棵小芽。",
    };
  }

  if (
    petBeforeIdx < PET_STATE_ORDER.indexOf("evolved") &&
    petAfterIdx >= PET_STATE_ORDER.indexOf("evolved")
  ) {
    return {
      id: `day${day}_pet_evolved`,
      title: `${petName}变成了成长形态。`,
      detail: "因为你也一直在成长。",
    };
  }

  return null;
}
