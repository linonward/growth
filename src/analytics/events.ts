import type { AnalyticsEvent, AnalyticsEventName } from "@/domain/types";

const MAX_EVENTS = 5000;

let counter = 0;

/** Monotonic-ish id that stays unique even for events in the same millisecond. */
function nextEventId(at: string): string {
  counter += 1;
  return `${at}-${counter.toString(36)}`;
}

export function createEvent(
  name: AnalyticsEventName,
  day: number,
  props?: AnalyticsEvent["props"],
): AnalyticsEvent {
  const at = new Date().toISOString();
  return { id: nextEventId(at), name, day, at, props };
}

/** Keep the log bounded so a long prototype session cannot blow the quota. */
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

/** Distinct days on which the given event fired. */
export function eventDays(
  events: readonly AnalyticsEvent[],
  name: AnalyticsEventName,
): number[] {
  return [...new Set(events.filter((e) => e.name === name).map((e) => e.day))].sort(
    (a, b) => a - b,
  );
}
