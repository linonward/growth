import { DAY_NARRATIVES } from "@/data/days";
import { ENERGY_PER_GOAL, isFinalDay, MAX_ENERGY_PER_DAY } from "./growth";
import { getPetState, isPetBorn, PET_STATE_LABELS } from "./pet";
import { getPlantState, PLANT_STATE_LABELS } from "./plant";
import { getWorldState } from "./world";

export type MilestoneKind =
  | "pick_goals"
  | "complete_goal"
  | "today_done"
  | "tomorrow"
  | "finale"
  | "continue";

export interface NextMilestone {
  id: string;
  kind: MilestoneKind;
  /** Big line, e.g. "再完成 1 个目标". */
  title: string;
  /** Supporting line explaining the world change that is coming. */
  detail: string;
  /** Energy still needed, when the milestone is a countable one. */
  energyRemaining: number | null;
  ctaLabel: string;
  ctaHref: string;
}

export interface MilestoneContext {
  day: number;
  totalEnergy: number;
  todayEnergy: number;
  selectedGoalCount: number;
  completedTodayCount: number;
  day7Completed: boolean;
  petName?: string;
}

/**
 * Describe the next visible world change if the student earns 10 more energy.
 *
 * Returns `null` when today's ceiling has already been reached, which lets the
 * caller switch from "do one more" to "come back tomorrow" copy.
 *
 * `todayEnergyAfter` mirrors describeRewardChange: Day 7's finale only unlocks
 * once the student acts that day, so the "after" view has to include the goal
 * that is about to be completed.
 */
export function predictNextChange(
  day: number,
  totalEnergy: number,
  petName = "小伙伴",
  todayEnergyAfter = ENERGY_PER_GOAL,
): string | null {
  const after = totalEnergy + ENERGY_PER_GOAL;
  const todayEnergyBefore = Math.max(0, todayEnergyAfter - ENERGY_PER_GOAL);

  const petNow = getPetState(day, totalEnergy, todayEnergyBefore);
  const petAfter = getPetState(day, after, todayEnergyAfter);
  if (petNow !== petAfter) {
    if (petAfter === "baby") return "蛋里的小伙伴就要出来了";
    if (petAfter === "evolved") return `${petName}会变成成长形态`;
    if (isPetBorn(petAfter)) return `${petName}看起来会更有精神`;
    return `蛋壳会发生变化：${PET_STATE_LABELS[petAfter]}`;
  }

  const plantNow = getPlantState(day, totalEnergy, todayEnergyBefore);
  const plantAfter = getPlantState(day, after, todayEnergyAfter);
  if (plantNow !== plantAfter) {
    return `成长植物会长到「${PLANT_STATE_LABELS[plantAfter]}」`;
  }

  const world = getWorldState(day, totalEnergy, todayEnergyBefore);
  const worldAfter = getWorldState(day, after, todayEnergyAfter);
  if (!world.newAreaUnlocked && worldAfter.newAreaUnlocked) {
    return "门后的世界会打开";
  }
  if (!world.rockUnlocked && worldAfter.rockUnlocked) {
    return "岛上会出现一块小石头";
  }
  if (!world.flowerUnlocked && worldAfter.flowerUnlocked) {
    return "岛上会开出第一朵花";
  }

  return "世界还会发生一点新的变化";
}

/**
 * The teaser line shown once today's goals are done.
 *
 * Each day owns the anticipation copy about the *following* day, so this reads
 * the current day's narrative rather than the next day's.
 */
export function tomorrowPreview(day: number): string {
  const current = DAY_NARRATIVES.find((n) => n.day === day);
  if (current) return current.tomorrowPreview;
  return "明天再来看看，这里还会发生变化。";
}

/**
 * The single "what should I do next?" answer shown on the home screen.
 *
 * This function must always return something — spec acceptance criterion AC3
 * says the home screen can always answer "下一步做什么？".
 */
export function getNextMilestone(ctx: MilestoneContext): NextMilestone {
  const {
    day,
    totalEnergy,
    todayEnergy,
    selectedGoalCount,
    completedTodayCount,
    day7Completed,
    petName = "小伙伴",
  } = ctx;

  // 1. Nothing picked yet today — the only sensible next step is choosing.
  if (selectedGoalCount === 0) {
    return {
      id: "pick_goals",
      kind: "pick_goals",
      title: "先选一个今天想成长的方向",
      detail: "选好之后，你的世界就会开始变化。",
      energyRemaining: null,
      ctaLabel: "去选今天的成长",
      ctaHref: "/goals",
    };
  }

  // 2. Day 7 finale: everything the week was building toward has unlocked.
  const world = getWorldState(day, totalEnergy, todayEnergy);
  if (isFinalDay(day) && world.newAreaUnlocked) {
    return {
      id: "day7_complete",
      kind: "continue",
      title: "你的世界已经完整了",
      detail: "这一切，都来自你现实里的成长。",
      energyRemaining: 0,
      ctaLabel: "回顾我的成长轨迹",
      ctaHref: "/history",
    };
  }

  // 3. Goals still open today.
  const remaining = Math.max(0, selectedGoalCount - completedTodayCount);
  if (remaining > 0 && todayEnergy < MAX_ENERGY_PER_DAY && !day7Completed) {
    const change = predictNextChange(
      day,
      totalEnergy,
      petName,
      todayEnergy + ENERGY_PER_GOAL,
    );
    return {
      id: `complete_${remaining}`,
      kind: "complete_goal",
      title: `再完成 ${remaining} 个目标`,
      detail: change ?? "今天还会发生新的变化",
      energyRemaining: remaining * ENERGY_PER_GOAL,
      ctaLabel: "查看今日目标",
      ctaHref: "/goals",
    };
  }

  // 4. Day 7 / final day but the finale has not landed yet.
  if (isFinalDay(day)) {
    return {
      id: "day7_finale",
      kind: "finale",
      title: "完成今天的目标",
      detail: "今天会有一件特别的事情发生。",
      energyRemaining: remaining * ENERGY_PER_GOAL,
      ctaLabel: "查看今日目标",
      ctaHref: "/goals",
    };
  }

  // 5. Today is done — the hook for coming back tomorrow.
  return {
    id: `tomorrow_${day + 1}`,
    kind: "tomorrow",
    title: "今天到这里就很好",
    detail: tomorrowPreview(day),
    energyRemaining: null,
    ctaLabel: "看看我的世界",
    ctaHref: "/",
  };
}
