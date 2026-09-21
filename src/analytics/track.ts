"use client";

import { send } from "@/analytics/client";
import { createEvent } from "@/analytics/events";
import { commonProps, type EventProps } from "@/analytics/properties";
import type {
  AnalyticsEvent,
  AnalyticsEventName,
  PetState,
  PlantState,
} from "@/domain/types";

/**
 * The analytics API the product code is allowed to use.
 *
 * Business code calls a named function with named arguments
 * (`trackGoalCompleted({ goalType: 'reading', ... })`) and never touches
 * `posthog.capture` directly. That keeps the wire format in one place, and
 * means swapping PostHog for a warehouse later does not touch a single
 * component.
 *
 * Every tracker also feeds the local event log, so `/debug/export` and the
 * offline JSON stay complete even when PostHog is unconfigured.
 */

/**
 * Local sink, registered by the store.
 *
 * Inverted on purpose: `track.ts` must not import the store (the store calls
 * trackers, so that would be a cycle). The store registers itself here instead.
 */
let sink: ((event: AnalyticsEvent) => void) | null = null;

export function registerEventSink(fn: (event: AnalyticsEvent) => void): void {
  sink = fn;
}

/** Emit one event to the local log and to PostHog. */
function emit(name: AnalyticsEventName, day: number, props: EventProps = {}): void {
  const merged = { ...commonProps(day), ...props };
  sink?.(createEvent(name, day, props));
  send(name, merged);
}

/* ------------------------------------------------------------- experiment */

export function trackExperimentStarted(input: {
  day: number;
  petSpecies: string;
  worldNameSet: boolean;
}): void {
  emit("experiment_started", input.day, {
    pet_species: input.petSpecies,
    world_name_set: input.worldNameSet,
  });
}

/** One per app open. `experiment_day` makes this the retention signal. */
export function trackSessionStarted(input: { day: number }): void {
  emit("session_started", input.day);
}

/* ----------------------------------------------------------------- screens */

export function trackWorldViewed(input: { day: number }): void {
  emit("world_viewed", input.day);
}

export function trackPetViewed(input: { day: number; petState: PetState }): void {
  emit("pet_viewed", input.day, { pet_state: input.petState });
}

export function trackPlantViewed(input: { day: number; plantState: PlantState }): void {
  emit("plant_viewed", input.day, { plant_state: input.plantState });
}

export function trackHistoryViewed(input: { day: number }): void {
  emit("history_viewed", input.day);
}

/* ------------------------------------------------------------------- goals */

/** `goal_type` lives here rather than in the event name — see properties.ts. */
export function trackGoalSelected(input: { day: number; goalType: string }): void {
  emit("goal_selected", input.day, { goal_type: input.goalType });
}

export function trackGoalCompleted(input: {
  day: number;
  goalType: string;
  energyEarned: number;
  petState: PetState;
  plantState: PlantState;
  totalEnergy: number;
}): void {
  emit("goal_completed", input.day, {
    goal_type: input.goalType,
    energy_earned: input.energyEarned,
    pet_state: input.petState,
    plant_state: input.plantState,
    total_energy: input.totalEnergy,
  });
}

/** Fires once per day, when the student finishes everything they picked. */
export function trackDayCompleted(input: {
  day: number;
  goalsCompleted: number;
  energyEarned: number;
}): void {
  emit("day_completed", input.day, {
    goals_completed: input.goalsCompleted,
    energy_earned: input.energyEarned,
  });
}

/* ------------------------------------------------------------------ reward */

/**
 * Fired when the reward moment closes, not when it opens.
 *
 * `stagesSeen` (1–4) is the point: the sequence is always skippable, so if
 * every student taps skip then nobody ever sees behaviour -> world change and
 * the whole P1 principle goes untested. This is the only way to know whether
 * that happened, and one property answers it.
 */
export function trackRewardViewed(input: {
  day: number;
  goalType: string;
  isMajor: boolean;
  target: string;
  stagesSeen: number;
}): void {
  emit("reward_viewed", input.day, {
    goal_type: input.goalType,
    is_major: input.isMajor,
    reward_target: input.target,
    stages_seen: input.stagesSeen,
  });
}

export function trackMilestoneViewed(input: { day: number; milestoneId: string }): void {
  emit("milestone_viewed", input.day, { milestone_id: input.milestoneId });
}

/* -------------------------------------------------------------- initiative */

/**
 * One event, not two.
 *
 * `initiative_answered` + `initiative: 'self' | 'prompted'` gives the SAAR
 * breakdown as a single PostHog query; separate `initiative_self` /
 * `initiative_prompted` events would need reconciling in every chart.
 */
export function trackInitiativeAnswered(input: {
  day: number;
  initiative: "self" | "prompted";
}): void {
  emit("initiative_answered", input.day, { initiative: input.initiative });
}

/* ------------------------------------------------------------ end of week */

export function trackDay7Completed(input: { day: number; totalEnergy: number }): void {
  emit("day7_completed", input.day, { total_energy: input.totalEnergy });
}

/** The reward button on the Day 7 finale — the strongest demand signal we have. */
export function trackContinueRequested(input: {
  day: number;
  totalEnergy: number;
}): void {
  emit("continue_requested", input.day, { total_energy: input.totalEnergy });
}

export type { AnalyticsEvent };
