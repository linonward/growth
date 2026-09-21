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

export type RewardTarget = "pet" | "plant" | "world" | "energy" | "stars";

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
/**
 * Work out what the world change should be for one completed goal.
 *
 * Spec section 5: every task earns a small reward, but only some tasks earn a
 * big visual change. We prefer a real domain transition when one happens, and
 * otherwise fall back to a light "energy" reward so the sequence never repeats
 * the same beat twice in a row.
 *
 * `activeDaysBefore` is how many days already had an action before this goal.
 * It drives the star garden, and it is the reason a reward is never
 * calendar-only: on a day where no pet or plant threshold is crossed, the child
 * still sees the world gain something because of what they just did (see
 * `domain/world.ts`).
 */
export function describeRewardChange(
  day: number,
  beforeEnergy: number,
  petName = "小伙伴",
  todayEnergyAfter = ENERGY_PER_GOAL,
  activeDaysBefore = 1,
): RewardChange {
  const afterEnergy = beforeEnergy + ENERGY_PER_GOAL;
  // The Day 7 finale is gated on acting today, so the "before" view must use
  // the pre-completion day participation and the "after" view the post- one.
  const todayEnergyBefore = Math.max(0, todayEnergyAfter - ENERGY_PER_GOAL);

  const petBefore = getPetState(day, beforeEnergy, todayEnergyBefore);
  const petAfter = getPetState(day, afterEnergy, todayEnergyAfter);
  const plantBefore = getPlantState(day, beforeEnergy, todayEnergyBefore);
  const plantAfter = getPlantState(day, afterEnergy, todayEnergyAfter);
  const worldBefore = getWorldState(
    day,
    beforeEnergy,
    todayEnergyBefore,
    activeDaysBefore,
  );
  const worldAfter = getWorldState(
    day,
    afterEnergy,
    todayEnergyAfter,
    activeDaysBefore + 1,
  );

  // 0. The gate opening leads, ahead of even the bloom.
  //
  //    Spec section 11 plays the whole closing beat "after completing the final
  //    task" — one moment, not three. A perfect student crosses 180 total
  //    energy on that single goal, so without this branch the sequence would
  //    run bloom → evolved and the door would open off-screen; and a student who
  //    did less would fall through to a minor plant/scenery line and never be
  //    told the thing the whole week promised had just happened.
  if (!worldBefore.newAreaUnlocked && worldAfter.newAreaUnlocked) {
    return {
      target: "world",
      isMajor: true,
      title: "门后的世界打开了！",
      detail: "7 天前，这里只有一颗蛋和一棵小芽。",
      from: "🚪",
      to: "🏞️",
    };
  }

  // 1. Day 7's bloom is Event 1 of the finale (spec section 11), so it leads
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

  // 3. Scenery transition. (The new area is handled at the top: it is the
  //    finale and must lead, not sit behind two minor scenery beats.)
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

  // 4. A new star: the first action of a day that had none yet.
  //
  //    This is what stops a reward from being calendar-only. Energy arrives in
  //    steps of 10, so a child completing one goal a day crosses a pet or plant
  //    threshold only every second or third day; without this, on the days in
  //    between the only new thing was a reveal they had not earned.
  if (worldAfter.starsEarned > worldBefore.starsEarned) {
    return {
      target: "stars",
      isMajor: false,
      title: "小星星园亮起了一颗新的星星。",
      detail: "这是你今天为世界做的第一件事。",
      from: "⭐",
      to: "🌟",
    };
  }

  // 5. Always-available small reward: light + energy.
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
