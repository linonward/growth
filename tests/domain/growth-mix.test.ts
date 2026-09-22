import { describe, expect, it } from "vitest";

import {
  computeGrowthMix,
  dominantGroup,
  EMPTY_MIX,
  GROVE_MAX_BUSHES,
  GROVE_MAX_STONES,
  GROVE_MAX_TREES,
  groveBushes,
  groveStones,
  groveTrees,
} from "@/domain/growth-mix";
import type { DailyGoal } from "@/domain/types";

/**
 * The island's shape is the world's second behaviour-driven axis (the first is
 * the star garden). What it has to get right is the thing the research
 * evaluation complained was missing: **two children with the same score should
 * be able to see different worlds, because they did different things.**
 */

const done = (day: number, templateId: string): DailyGoal => ({
  id: `d${day}-${templateId}`,
  day,
  templateId,
  completed: true,
});

const notDone = (day: number, templateId: string): DailyGoal => ({
  id: `d${day}-${templateId}`,
  day,
  templateId,
  completed: false,
});

describe("computeGrowthMix", () => {
  it("starts empty", () => {
    expect(computeGrowthMix({})).toEqual(EMPTY_MIX);
  });

  it("counts completed goals by part of the day", () => {
    const mix = computeGrowthMix({
      1: [done(1, "math"), done(1, "exercise"), done(1, "participate")],
      2: [done(2, "reading"), done(2, "interest")],
    });
    expect(mix).toEqual({ study: 2, school: 1, life: 2, total: 5 });
  });

  it("ignores goals that were only picked, never done", () => {
    // Selecting three goals and doing none of them must not grow anything: the
    // island is a record of behaviour, not of intentions.
    const mix = computeGrowthMix({ 1: [done(1, "math"), notDone(1, "chinese")] });
    expect(mix).toEqual({ study: 1, school: 0, life: 0, total: 1 });
  });

  it("ignores an unknown template rather than counting it somewhere", () => {
    const mix = computeGrowthMix({ 1: [done(1, "something-removed")] });
    expect(mix.total).toBe(0);
  });
});

describe("grove counts", () => {
  it("grows slowly, so the island reads as a place and not a bar chart", () => {
    // One tree per two study goals: a single goal changes nothing visually.
    expect(groveTrees({ ...EMPTY_MIX, study: 1, total: 1 })).toBe(0);
    expect(groveTrees({ ...EMPTY_MIX, study: 2, total: 2 })).toBe(1);
    expect(groveTrees({ ...EMPTY_MIX, study: 7, total: 7 })).toBe(3);
  });

  it("caps so the known scene layout cannot turn into a forest", () => {
    const huge = { study: 99, school: 99, life: 99, total: 297 };
    expect(groveTrees(huge)).toBe(GROVE_MAX_TREES);
    expect(groveBushes(huge)).toBe(GROVE_MAX_BUSHES);
    expect(groveStones(huge)).toBe(GROVE_MAX_STONES);
  });

  it("keeps the three parts independent", () => {
    // Only study goals → no bushes and no stones. This is what makes the island
    // a picture of the child's week rather than of their score.
    const studyOnly = { study: 20, school: 0, life: 0, total: 20 };
    expect(groveTrees(studyOnly)).toBeGreaterThan(0);
    expect(groveBushes(studyOnly)).toBe(0);
    expect(groveStones(studyOnly)).toBe(0);
  });

  it("gives two children with the same score different islands", () => {
    // The point of the whole axis: identical totals, different worlds.
    const reader = computeGrowthMix({ 1: [done(1, "math"), done(1, "reading")] });
    const mover = computeGrowthMix({ 1: [done(1, "exercise"), done(1, "helping")] });
    expect(reader.total).toBe(mover.total);
    expect(groveTrees(reader)).toBeGreaterThan(groveTrees(mover));
    expect(groveBushes(mover)).toBeGreaterThan(groveBushes(reader));
  });

  it("never returns a negative or fractional count", () => {
    for (const mix of [
      { ...EMPTY_MIX },
      { study: -3, school: -1, life: -2, total: -6 },
      { study: 1.7, school: 2.2, life: 0.9, total: 4.8 },
    ]) {
      for (const n of [groveTrees(mix), groveBushes(mix), groveStones(mix)]) {
        expect(Number.isInteger(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("dominantGroup", () => {
  it("is null before anything is done", () => {
    expect(dominantGroup(EMPTY_MIX)).toBeNull();
  });

  it("names the part of the day the island has grown most from", () => {
    expect(dominantGroup({ study: 5, school: 1, life: 2, total: 8 })).toBe("study");
    expect(dominantGroup({ study: 1, school: 4, life: 1, total: 6 })).toBe("school");
    expect(dominantGroup({ study: 1, school: 1, life: 3, total: 5 })).toBe("life");
  });

  it("breaks a tie deterministically, so the same history reads the same", () => {
    // A tie is common early on (one goal each). It must not flicker between
    // renders, or the caption would contradict itself on every visit.
    const first = dominantGroup({ study: 2, school: 2, life: 1, total: 5 });
    const again = dominantGroup({ study: 2, school: 2, life: 1, total: 5 });
    expect(first).toBe(again);
    expect(first).toBe("school");
  });

  it("is null when a mix has a total but no counted goals", () => {
    expect(dominantGroup({ study: 0, school: 0, life: 0, total: 3 })).toBeNull();
  });
});
