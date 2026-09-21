/**
 * Core domain types for the Phase 0 growth world prototype.
 *
 * These mirror the spec's data model (section 16) and are intentionally free of
 * any React / browser dependency so they can be unit tested in isolation.
 */

import type { RewardChange } from "./reward";

/**
 * Where a goal sits in the day: at home studying, at school, or in daily life.
 *
 * The picker groups by this so a student can see they are choosing across the
 * three parts of their day rather than piling everything into one.
 */
export type GoalGroup = "study" | "school" | "life";

/**
 * Goal categories.
 *
 * Learning is split by subject on purpose: "专注学习 20 分钟" gave a child
 * nothing to actually do, and no way to tell whether they had done it. Every
 * goal now names a subject, an action and an amount.
 */
export type GoalCategory =
  // 学习（家里）
  | "math"
  | "chinese"
  | "english"
  | "reading"
  // 学校
  | "participate"
  | "ask_teacher"
  | "stay_seated"
  | "attend"
  // 生活
  | "exercise"
  | "interest"
  | "helping";

/** Phase 0 fixed goal definition. Free text entry is explicitly out of scope. */
export interface GoalTemplate {
  id: string;
  category: GoalCategory;
  group: GoalGroup;
  title: string;
  /**
   * The concrete measure, shown next to the title: "15 分钟", "6 个字", "1 次".
   *
   * This is what makes a goal checkable by the child alone — no adult has to
   * judge whether it was done.
   */
  amount: string;
  description: string;
  energy: 10;
  /** Presentation only, used by the reward moment. */
  emoji: string;
}

/** A goal the student picked for one specific day. */
export interface DailyGoal {
  id: string;
  day: number;
  templateId: string;
  completed: boolean;
  completedAt?: string;
}

export type PetState =
  | "egg"
  | "wiggling_egg"
  | "cracked_egg"
  | "baby"
  | "young"
  | "evolved";

export type PlantState =
  | "seed"
  | "sprout"
  | "leaf"
  | "young_plant"
  | "bud"
  | "tree"
  | "bloom";

export type PetSpecies = "fox" | "cat" | "rabbit";

export interface WorldState {
  /** Day 4+ (or a full first day) puts the first flower on the island. */
  flowerUnlocked: boolean;
  butterflyUnlocked: boolean;
  /** Day 6+ reveals the vine-covered door. Deliberately never opens on Day 6. */
  mysteryGateUnlocked: boolean;
  /** Day 7 finale only. */
  newAreaUnlocked: boolean;
  /** Day 1 progressive detail: appears once the world has real shape. */
  rockUnlocked: boolean;
  /** Day 1 progressive detail: the sky wakes up after the first goal. */
  skyGlow: boolean;
}

export interface GrowthState {
  currentDay: number;
  totalEnergy: number;
  todayEnergy: number;
  petState: PetState;
  plantState: PlantState;
  worldState: WorldState;
}

export interface UserProfile {
  worldName: string;
  petName: string;
  startedAt: string;
  petSpecies: PetSpecies;
}

export interface DailyCheckIn {
  day: number;
  initiative?: "self" | "prompted";
  openedAt: string;
}

/** The four-stage reward sequence described in spec section 5. */
export type RewardStage = "confirm" | "energy" | "change" | "next";

export interface RewardMilestone {
  id: string;
  title: string;
  detail: string;
}

export interface RewardMoment {
  goalId: string;
  templateId: string;
  day: number;
  /** Stage 3 content: what actually changed in the world. */
  change: RewardChange;
  /** A day-level moment worth extra emphasis, when one happened. */
  milestone: RewardMilestone | null;
  /** Day 7's three-beat finale sequence. */
  isFinale: boolean;
  totalEnergyAfter: number;
  todayEnergyAfter: number;
}

/**
 * The Phase 0 event schema.
 *
 * Deliberately small and hypothesis-driven: each event answers one of the six
 * questions the experiment is actually asking (who came, did they return, how
 * many goals, self- or parent-prompted, who reached Day 7, did they ask to
 * continue). Do not add an event per button — extend an existing event's
 * properties instead, the way `goal_completed` carries `goal_type`.
 *
 * Declared as a runtime array so tests and tooling can assert against exactly
 * the same list the types are derived from.
 */
export const ANALYTICS_EVENT_NAMES = [
  "experiment_started",
  "session_started",
  "world_viewed",
  "goal_selected",
  "goal_completed",
  "reward_viewed",
  "pet_viewed",
  "plant_viewed",
  "history_viewed",
  "initiative_answered",
  "milestone_viewed",
  "day_completed",
  "day7_completed",
  "continue_requested",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export interface AnalyticsEvent {
  id: string;
  name: AnalyticsEventName;
  day: number;
  at: string;
  props?: Record<string, string | number | boolean | null>;
}
