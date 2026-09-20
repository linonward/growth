import type { PetState, PlantState } from "@/domain/types";

/**
 * Shared event properties.
 *
 * Every event carries the same two properties so PostHog can always segment by
 * them without per-event work:
 *
 *   experiment_version — bump this when the growth loop changes, so phase0-v1
 *                        and phase0-v2 can be compared as cohorts
 *   experiment_day     — which of the 7 days the event belongs to
 *
 * Keep this list small: properties are what make the events analysable, but
 * every extra one is a column nobody looks at.
 */

export const EXPERIMENT_VERSION = "phase0-v1";

export const EXPERIMENT_DEFAULT_PROPS = {
  experiment_version: EXPERIMENT_VERSION,
} as const;

export type EventProps = Record<string, string | number | boolean | null>;

/** Properties attached to every single event. */
export function commonProps(day: number): EventProps {
  return {
    experiment_version: EXPERIMENT_VERSION,
    experiment_day: day,
  };
}

/**
 * Goal identity is a property, not part of the event name.
 *
 * `goal_completed` + `goal_type: 'reading'` is one event that breaks down five
 * ways; `reading_completed` / `study_completed` / ... would be five events that
 * every funnel and retention query has to special-case.
 */
export interface GoalProps extends EventProps {
  goal_type: string;
}

/** Growth-state snapshot, useful for explaining drop-off against progress. */
export function growthSnapshot(petState: PetState, plantState: PlantState): EventProps {
  return { pet_state: petState, plant_state: plantState };
}
