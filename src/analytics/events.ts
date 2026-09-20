import { commonProps } from "@/analytics/properties";
import type { AnalyticsEvent, AnalyticsEventName } from "@/domain/types";

const MAX_EVENTS = 2000;

let counter = 0;

/** Monotonic-ish id that stays unique even for events in the same millisecond. */
function nextEventId(at: string): string {
  counter += 1;
  return `${at}-${counter.toString(36)}`;
}

/**
 * Build a local event record.
 *
 * `experiment_day` and `experiment_version` are merged in here rather than at
 * each call site, so it is structurally impossible to emit an event that is
 * missing them.
 */
export function createEvent(
  name: AnalyticsEventName,
  day: number,
  props?: AnalyticsEvent["props"],
): AnalyticsEvent {
  const at = new Date().toISOString();
  return {
    id: nextEventId(at),
    name,
    day,
    at,
    props: { ...commonProps(day), ...props },
  };
}

/** Keep the log bounded so a long session cannot blow the storage quota. */
export function appendEvent(
  events: readonly AnalyticsEvent[],
  event: AnalyticsEvent,
): AnalyticsEvent[] {
  const next = [...events, event];
  return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next;
}

export function countEvents(
  events: readonly AnalyticsEvent[],
  name: AnalyticsEventName,
): number {
  return events.filter((e) => e.name === name).length;
}

/** Distinct days on which the given event fired — used for retention maths. */
export function eventDays(
  events: readonly AnalyticsEvent[],
  name: AnalyticsEventName,
): number[] {
  return [...new Set(events.filter((e) => e.name === name).map((e) => e.day))].sort(
    (a, b) => a - b,
  );
}

/**
 * Count `initiative_answered` events with a given answer.
 *
 * The answer is a property, not a separate event, so the breakdown is one
 * PostHog query instead of two events to reconcile.
 */
export function countInitiative(
  events: readonly AnalyticsEvent[],
  value: "self" | "prompted",
): number {
  return events.filter(
    (e) => e.name === "initiative_answered" && e.props?.initiative === value,
  ).length;
}
