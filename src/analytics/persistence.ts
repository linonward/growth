"use client";

import { ANALYTICS_KEY } from "@/domain/constants";
import type { AnalyticsEvent } from "@/domain/types";

/**
 * The analytics log lives in its own localStorage key, apart from game state.
 *
 * It used to be a field of the persisted store, which meant zustand re-serialised
 * the entire event array on every state change — measured at 84% of every write,
 * growing all week. Splitting it out means:
 *
 *   1. game-state writes no longer carry the (much larger) event log, and
 *   2. events are written in debounced batches instead of once per event.
 *
 * Every storage access is wrapped: localStorage throws in Safari private mode
 * and when the quota is exceeded, and analytics must never break the app.
 */

const SCHEMA_VERSION = 1;
const FLUSH_DELAY_MS = 800;

interface StoredAnalytics {
  version: number;
  savedAt: string;
  events: AnalyticsEvent[];
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;
/** The events waiting to be written; also used for the synchronous flush. */
let pending: AnalyticsEvent[] | null = null;
/** Last payload written, so an unchanged batch costs nothing. */
let lastWritten: string | null = null;
let listenersInstalled = false;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Read the persisted event log. Returns [] when missing or unreadable. */
export function readEvents(): AnalyticsEvent[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(ANALYTICS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<StoredAnalytics>;
    return Array.isArray(parsed?.events) ? parsed.events : [];
  } catch {
    return [];
  }
}

export function clearEvents(): void {
  pending = null;
  lastWritten = null;
  try {
    storage()?.removeItem(ANALYTICS_KEY);
  } catch {
    // ignore
  }
}

function writeNow(events: AnalyticsEvent[]): void {
  const store = storage();
  if (!store) return;
  let payload: string;
  try {
    payload = JSON.stringify({
      version: SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      events,
    } satisfies StoredAnalytics);
  } catch {
    return;
  }
  if (payload === lastWritten) return;
  try {
    store.setItem(ANALYTICS_KEY, payload);
    lastWritten = payload;
    pending = null;
  } catch {
    // Quota exceeded or storage disabled: keep the in-memory log usable.
  }
}

/** Queue a write. Rapid bursts collapse into a single storage write. */
export function persistEvents(events: AnalyticsEvent[]): void {
  pending = events;
  if (flushTimer !== null) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    if (pending) writeNow(pending);
  }, FLUSH_DELAY_MS);
}

/** Write immediately — used when the page is going away. */
export function flushEvents(): void {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (pending) writeNow(pending);
}

/**
 * Flush on the events that reliably precede a page being discarded.
 * `visibilitychange` covers mobile Safari, which often skips `pagehide`.
 */
export function installFlushListeners(): void {
  if (listenersInstalled || typeof window === "undefined") return;
  listenersInstalled = true;
  window.addEventListener("pagehide", flushEvents);
  window.addEventListener("beforeunload", flushEvents);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushEvents();
  });
}
