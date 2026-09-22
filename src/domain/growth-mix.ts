import { getGoalTemplate } from "@/data/goals";
import type { DailyGoal, GoalGroup } from "./types";

/**
 * What a child has actually been doing, counted by part of the day.
 *
 * This is the world's **expression** axis: the island's scenery grows out of the
 * mix of goals a child has completed, so two children who have done the same
 * number of goals can still see different islands — because they did different
 * things.
 *
 * Why it matters beyond decoration: the research evaluation (§4) found that
 * every Day 1–6 change used to be calendar-driven, so "my behaviour changed the
 * world" was never actually tested. The star garden gave that a first answer
 * ("I showed up"); this gives the second ("what I did shows"). Neither uses a
 * currency, so unlike the theme unlocks this axis costs the experiment nothing.
 *
 * Derived, never stored: `goalsByDay` already holds the answers, so there is no
 * new counter to drift and no new analytics event. A reset clears it for free.
 */
export interface GrowthMix {
  study: number;
  school: number;
  life: number;
  /** Completed goals of any kind, which is what the island scales with. */
  total: number;
}

export const EMPTY_MIX: GrowthMix = { study: 0, school: 0, life: 0, total: 0 };

/** Count completed goals per part of the day. Uncompleted goals do not count. */
export function computeGrowthMix(goalsByDay: Record<number, DailyGoal[]>): GrowthMix {
  const mix: GrowthMix = { ...EMPTY_MIX };
  for (const goals of Object.values(goalsByDay)) {
    for (const goal of goals) {
      if (!goal.completed) continue;
      const group: GoalGroup | undefined = getGoalTemplate(goal.templateId)?.group;
      if (!group) continue;
      mix[group] += 1;
      mix.total += 1;
    }
  }
  return mix;
}

/**
 * How many trees the island grows: one per two study goals, capped.
 *
 * Deliberately coarse. A one-tree-per-goal island would be a bar chart, and this
 * is meant to read as a place, not as a scoreboard. The cap keeps the known
 * scene layout from turning into a forest after three perfect days.
 */
export const GROVE_STUDY_PER_TREE = 2;
export const GROVE_MAX_TREES = 4;
export const GROVE_LIFE_PER_BUSH = 2;
export const GROVE_MAX_BUSHES = 3;
export const GROVE_SCHOOL_PER_STONE = 2;
export const GROVE_MAX_STONES = 3;

/**
 * Shared shape for the three counts.
 *
 * Clamped at both ends: a negative count (from a corrupted or hand-edited save)
 * would otherwise become a negative array slice length in the sprite, which
 * silently draws the *last* spots instead of none.
 */
function grown(count: number, per: number, max: number): number {
  if (!Number.isFinite(count)) return 0;
  return Math.max(0, Math.min(max, Math.floor(count / per)));
}

export function groveTrees(mix: GrowthMix): number {
  return grown(mix.study, GROVE_STUDY_PER_TREE, GROVE_MAX_TREES);
}

export function groveBushes(mix: GrowthMix): number {
  return grown(mix.life, GROVE_LIFE_PER_BUSH, GROVE_MAX_BUSHES);
}

/** Stepping stones mark the school goals — the part of the day done elsewhere. */
export function groveStones(mix: GrowthMix): number {
  return grown(mix.school, GROVE_SCHOOL_PER_STONE, GROVE_MAX_STONES);
}

/** Which part of the day this island has grown most from, or null if nothing yet. */
export function dominantGroup(mix: GrowthMix): GoalGroup | null {
  if (mix.total === 0) return null;
  const entries: Array<[GoalGroup, number]> = [
    ["study", mix.study],
    ["school", mix.school],
    ["life", mix.life],
  ];
  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return entries[0][1] === 0 ? null : entries[0][0];
}
