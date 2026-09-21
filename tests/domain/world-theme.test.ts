import { describe, expect, it } from "vitest";

import {
  DEFAULT_THEME,
  isThemeUnlocked,
  isWorldThemeId,
  nextLockedTheme,
  resolveWorldTheme,
  themeTier,
  unlockedThemeCount,
  WORLD_THEME_IDS,
} from "@/domain/world-theme";

/**
 * The theme ladder is an **unlock economy**, which is the one thing this project
 * is supposed to be testing the absence of. These tests pin the two properties
 * that keep the damage small — the currency is stars that already existed, and
 * an unlock is never taken back — and the boundary conditions that would
 * otherwise hand out free themes or lock a child out of one they had.
 */

describe("ladder", () => {
  it("starts free and costs one more star per step", () => {
    // Order *is* price: index n costs n. Asserting it here means the rule cannot
    // drift from the ladder without a test failing.
    expect(WORLD_THEME_IDS[0]).toBe(DEFAULT_THEME);
    for (const [index, id] of WORLD_THEME_IDS.entries()) {
      expect(themeTier(id)).toBe(index);
      expect(isThemeUnlocked(id, index)).toBe(true);
      if (index > 0) expect(isThemeUnlocked(id, index - 1)).toBe(false);
    }
  });

  it("always has at least the default open, even with no stars", () => {
    // A child who has done nothing still has a world to look at.
    expect(unlockedThemeCount(0)).toBe(1);
    expect(isThemeUnlocked(DEFAULT_THEME, 0)).toBe(true);
  });

  it("opens one more look per star, up to the whole ladder", () => {
    expect(unlockedThemeCount(1)).toBe(2);
    expect(unlockedThemeCount(2)).toBe(3);
    // Past the end it stays at the end rather than running off the array.
    expect(unlockedThemeCount(99)).toBe(WORLD_THEME_IDS.length);
  });

  it("treats rubbish star counts as none rather than throwing", () => {
    for (const value of [Number.NaN, -5, 0.4, Number.POSITIVE_INFINITY]) {
      const count = unlockedThemeCount(value);
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(WORLD_THEME_IDS.length);
    }
  });

  it("never takes an unlock back as the ladder grows", () => {
    // Unlocks depend on stars *earned*, so switching between themes is free
    // after the first time. If this ever became spend-based, a six-year-old
    // would experience it as losing something (P5).
    for (let stars = 0; stars <= WORLD_THEME_IDS.length + 2; stars += 1) {
      const unlocked = WORLD_THEME_IDS.filter((id) => isThemeUnlocked(id, stars));
      // Monotonic: more stars never opens fewer themes.
      const previous = WORLD_THEME_IDS.filter((id) => isThemeUnlocked(id, stars - 1));
      expect(unlocked.length).toBeGreaterThanOrEqual(previous.length);
    }
  });
});

describe("nextLockedTheme", () => {
  it("names the next look and what it still needs", () => {
    expect(nextLockedTheme(0)).toEqual({ id: WORLD_THEME_IDS[1], starsNeeded: 1 });
    expect(nextLockedTheme(1)).toEqual({ id: WORLD_THEME_IDS[2], starsNeeded: 1 });
  });

  it("returns null once everything is open", () => {
    expect(nextLockedTheme(WORLD_THEME_IDS.length)).toBeNull();
    expect(nextLockedTheme(99)).toBeNull();
  });
});

describe("resolveWorldTheme", () => {
  it("keeps a known theme", () => {
    for (const id of WORLD_THEME_IDS) expect(resolveWorldTheme(id)).toBe(id);
  });

  it("falls back to the default for a world saved before themes existed", () => {
    // Old saves have no value at all; that must render the standard look rather
    // than nothing.
    expect(resolveWorldTheme(undefined)).toBe(DEFAULT_THEME);
    expect(resolveWorldTheme(null)).toBe(DEFAULT_THEME);
    expect(resolveWorldTheme("")).toBe(DEFAULT_THEME);
  });

  it("ignores a theme this build does not know", () => {
    // A world saved by a build with a longer ladder must not break here.
    expect(resolveWorldTheme("winter")).toBe(DEFAULT_THEME);
    expect(resolveWorldTheme(7)).toBe(DEFAULT_THEME);
    expect(isWorldThemeId("winter")).toBe(false);
  });
});
