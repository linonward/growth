"use client";

import { PARTICIPANT_KEY } from "@/domain/constants";

/**
 * Anonymous, stable participant identity.
 *
 * The target users are 8–12 year olds, so data minimisation starts here: the
 * only identifier this prototype ever uses is a locally generated UUID. There
 * is deliberately no email, phone, name, school or any other real identity —
 * do not add one. `posthog.identify()` must only ever receive this UUID.
 *
 * It lives in its own storage key so it survives a prototype reset: a reset
 * clears progress, not who the participant is.
 */

/** Cache so repeat calls do not hit localStorage. */
let cached: string | null = null;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function generate(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to the manual path below
  }
  // Fallback for older browsers without crypto.randomUUID.
  return "p-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * The participant id for this device. Generated once, then reused forever.
 *
 * Returns a stable value even when storage is unavailable (private mode): the
 * in-memory cache keeps the identity consistent for the life of the page
 * instead of minting a new one on every call.
 */
export function getParticipantId(): string {
  if (cached) return cached;

  const store = storage();
  if (store) {
    try {
      const existing = store.getItem(PARTICIPANT_KEY);
      if (existing) {
        cached = existing;
        return existing;
      }
    } catch {
      // ignore and fall through to creation
    }
  }

  const created = generate();
  cached = created;
  if (store) {
    try {
      store.setItem(PARTICIPANT_KEY, created);
    } catch {
      // Storage disabled or full: this page visit still reports consistently.
    }
  }
  return created;
}

/** Test helper: forget the in-memory cache so storage is re-read. */
export function __resetParticipantCache(): void {
  cached = null;
}
