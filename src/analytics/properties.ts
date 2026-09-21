import type { AgeBand, PetState, PlantState } from "@/domain/types";

/**
 * Shared event properties.
 *
 * Every event carries the same properties so PostHog can always segment by them
 * without per-event work:
 *
 *   experiment_version — bump this when the participant mix or the growth loop
 *                        changes, so cohorts are never silently pooled
 *   experiment_day     — which of the 7 days the event belongs to
 *   age_band           — how old the participant is, recorded by the experimenter
 *
 * Keep this list small: properties are what make the events analysable, but
 * every extra one is a column nobody looks at.
 */

/**
 * `phase0-v2` — the study now covers 6–12 rather than 8–12, and `age_band` is
 * part of the common properties.
 *
 * Bumped deliberately: v1 and v2 have a different participant mix, so pooling
 * them would make "the 6–8 group" a mixture of a study that never recruited that
 * age and one that did. PostHog cohorts and the offline analysis both split on
 * this.
 */
export const EXPERIMENT_VERSION = "phase0-v2";

/**
 * The age band currently in effect.
 *
 * Module state rather than a parameter because `commonProps()` is called from
 * two places that must agree — `createEvent()` for the local log and `emit()`
 * for the wire — and a threaded argument could drift between them. The store
 * pushes the value here on hydration and whenever the experimenter changes it,
 * which keeps the analytics layer free of any store import (that would be a
 * cycle: the store calls the trackers).
 *
 * `null` means "not recorded yet", and it is sent as an explicit `null` rather
 * than omitted: a missing key is indistinguishable from "this event type does
 * not carry it". An event without a band is honest; an event with a guessed band
 * is a corrupted cohort.
 */
let activeAgeBand: AgeBand | null = null;

/** Called by the store. Never throws; `null` is a valid value. */
export function setActiveAgeBand(band: AgeBand | null): void {
  activeAgeBand = band;
}

/** What the trackers will attach to the next event. */
export function getActiveAgeBand(): AgeBand | null {
  return activeAgeBand;
}

export const EXPERIMENT_DEFAULT_PROPS = {
  experiment_version: EXPERIMENT_VERSION,
} as const;

export type EventProps = Record<string, string | number | boolean | null>;

/** Properties attached to every single event. */
export function commonProps(day: number): EventProps {
  return {
    experiment_version: EXPERIMENT_VERSION,
    experiment_day: day,
    age_band: activeAgeBand,
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
