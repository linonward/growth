"use client";

import { getParticipantId } from "@/analytics/participant";
import { EXPERIMENT_VERSION } from "@/analytics/properties";

/**
 * The only module that delivers events to PostHog.
 *
 * Everything else goes through `track.ts`, so swapping PostHog for a warehouse
 * or a self-hosted collector later touches this file and nothing in the
 * product code.
 *
 * Requests go through this app's own /ingest path (see next.config.ts), which
 * PostHog's Next.js guide recommends so that tracking blockers do not silently
 * drop them.
 *
 * Why this posts to PostHog's HTTP capture API instead of using posthog-js:
 * the SDK (v1.434.2) was verified — on a plain static page, with its own
 * prebuilt bundle and a minimal `{ api_host }` config — to initialise, fetch
 * its remote config, accept `capture()` calls, and then never transmit an
 * event. Posting to the documented `/batch/` endpoint from the same browser
 * returns 200 and the events arrive. Every SDK feature we would otherwise get
 * (autocapture, session replay, feature flags, surveys) is deliberately off
 * anyway and we send a fixed 14-event list, so the HTTP API is both simpler
 * and the one path that demonstrably works.
 *
 * Privacy posture for a prototype used by 8–12 year olds:
 *   - anonymous participant UUID only, never a real identity
 *   - an explicit, hypothesis-driven event list — no autocapture
 *   - no URLs, referrers or query strings are ever sent
 *   - no session replay, no feature flags, no surveys
 */

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

/**
 * Same-origin path that Next.js rewrites to PostHog (see next.config.ts).
 *
 * Posting straight to `us.i.posthog.com` would be silently dropped by tracking
 * blockers, which ship rules for `posthog.com` — so on any family device
 * running one, the experiment would quietly collect nothing. Going through our
 * own origin is PostHog's own recommendation for Next.js.
 */
const ENDPOINT = process.env.NEXT_PUBLIC_POSTHOG_PROXY ?? "/ingest";

/** Flush when this many events are queued, or after the delay below. */
const MAX_BATCH = 10;
const FLUSH_DELAY_MS = 2000;

/** The transport seam. Tests substitute this; nothing else needs to know. */
export interface AnalyticsTransport {
  capture(name: string, props: Record<string, unknown>): void;
}

interface QueuedEvent {
  event: string;
  distinct_id: string;
  timestamp: string;
  properties: Record<string, unknown>;
}

let client: AnalyticsTransport | null = null;
let initPromise: Promise<AnalyticsTransport | null> | null = null;
let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersInstalled = false;

/** True when an API key is configured; without it analytics is a no-op. */
export function isAnalyticsConfigured(): boolean {
  return Boolean(KEY);
}

function post(path: string, body: unknown, keepalive = false): void {
  if (!KEY) return;
  try {
    void fetch(`${ENDPOINT}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive,
    }).catch(() => {
      // A network failure must never surface to the student.
    });
  } catch {
    // ignore
  }
}

/** Send everything queued. Safe to call at any time; never throws. */
export function flushAnalytics(): void {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0) return;
  const batch = queue;
  queue = [];
  post("/batch/", { api_key: KEY, batch }, true);
}

/**
 * Flush when the page is going away. `visibilitychange` covers mobile Safari,
 * which frequently skips `pagehide`.
 */
function installFlushListeners(): void {
  if (listenersInstalled || typeof window === "undefined") return;
  listenersInstalled = true;
  window.addEventListener("pagehide", flushAnalytics);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAnalytics();
  });
}

const httpTransport: AnalyticsTransport = {
  capture(name, props) {
    queue.push({
      event: name,
      distinct_id: getParticipantId(),
      timestamp: new Date().toISOString(),
      properties: props,
    });
    if (queue.length >= MAX_BATCH) {
      flushAnalytics();
      return;
    }
    if (flushTimer === null) {
      flushTimer = setTimeout(flushAnalytics, FLUSH_DELAY_MS);
    }
  },
};

/**
 * Establish the anonymous identity.
 *
 * The participant id is resolved during hydration whether or not analytics is
 * configured (see `store/hooks.ts`), so this only registers it with PostHog.
 * `$identify` carries `experiment_version` and nothing else — no real-world
 * identifier is ever sent.
 */
export function initAnalytics(): Promise<AnalyticsTransport | null> {
  if (initPromise) return initPromise;
  if (typeof window === "undefined" || !KEY) {
    initPromise = Promise.resolve(null);
    return initPromise;
  }

  installFlushListeners();
  client = httpTransport;

  post("/e/?ip=0", {
    api_key: KEY,
    event: "$identify",
    distinct_id: getParticipantId(),
    timestamp: new Date().toISOString(),
    properties: { $set: { experiment_version: EXPERIMENT_VERSION } },
  });

  initPromise = Promise.resolve(httpTransport);
  return initPromise;
}

/** The live transport, or null when analytics is unconfigured. */
export function getAnalyticsClient(): AnalyticsTransport | null {
  return client;
}

/** Deliver one event. Never throws; does nothing when unconfigured. */
export function send(name: string, props: Record<string, unknown>): void {
  const active = client;
  if (!active) return;
  try {
    active.capture(name, props);
  } catch {
    // ignore
  }
}

/** Test helper. */
export function __setAnalyticsClient(next: AnalyticsTransport | null): void {
  client = next;
  initPromise = Promise.resolve(next);
}

/** Test helper: drop anything queued. */
export function __clearQueue(): void {
  queue = [];
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}
