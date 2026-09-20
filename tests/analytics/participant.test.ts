import { beforeEach, describe, expect, it } from "vitest";

import { __resetParticipantCache, getParticipantId } from "@/analytics/participant";
import { PARTICIPANT_KEY } from "@/domain/constants";

/**
 * AC ① stable anonymous participant id
 * AC ② refreshing the page does not mint a new participant
 * AC ③ no real identity is ever collected
 */
describe("anonymous participant id", () => {
  beforeEach(() => {
    localStorage.clear();
    __resetParticipantCache();
  });

  it("mints an id on first use and stores it", () => {
    const id = getParticipantId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(localStorage.getItem(PARTICIPANT_KEY)).toBe(id);
  });

  it("AC ① returns the same id for every call", () => {
    const first = getParticipantId();
    expect(getParticipantId()).toBe(first);
    expect(getParticipantId()).toBe(first);
  });

  it("AC ② survives a reload — a cold cache re-reads the stored id", () => {
    const first = getParticipantId();
    // Simulate a fresh page: module cache gone, storage intact.
    __resetParticipantCache();
    expect(getParticipantId()).toBe(first);
  });

  it("AC ② two participants on one device stay distinct", () => {
    const first = getParticipantId();
    localStorage.clear();
    __resetParticipantCache();
    const second = getParticipantId();
    expect(second).not.toBe(first);
  });

  it("AC ③ contains no personal data — only a bare uuid", () => {
    const id = getParticipantId();
    expect(id).not.toMatch(/@/); // no email
    expect(id).not.toMatch(/^\+?\d[\d\s-]{6,}$/); // no phone
    // Only one key is written, and it holds nothing but the identifier.
    const keys = Object.keys(localStorage);
    expect(keys).toEqual([PARTICIPANT_KEY]);
    expect(localStorage.getItem(PARTICIPANT_KEY)).toBe(id);
  });

  it("lives in its own key so a prototype reset keeps the identity", () => {
    const id = getParticipantId();
    // A progress reset clears the game and analytics keys, not this one.
    localStorage.removeItem("growth-world-prototype-v1");
    localStorage.removeItem("growth-world-analytics-v1");
    __resetParticipantCache();
    expect(getParticipantId()).toBe(id);
  });

  it("still returns a stable id when storage is unavailable", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("storage disabled");
      },
    });
    try {
      __resetParticipantCache();
      const id = getParticipantId();
      // Same page session must not mint a new id on every call.
      expect(getParticipantId()).toBe(id);
    } finally {
      if (original) Object.defineProperty(window, "localStorage", original);
    }
  });
});
