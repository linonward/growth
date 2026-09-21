import { describe, expect, it } from "vitest";
import { MAX_TOTAL_ENERGY } from "@/domain/constants";
import { getCloudCount, getWorldState, isMysteryGateOpen } from "@/domain/world";

describe("getWorldState", () => {
  it("starts with a bare world on Day 1", () => {
    const world = getWorldState(1, 0);
    expect(world).toEqual({
      skyGlow: false,
      rockUnlocked: false,
      flowerUnlocked: false,
      butterflyUnlocked: false,
      mysteryGateUnlocked: false,
      newAreaUnlocked: false,
    });
  });

  it("wakes the sky after the first goal and drops a rock after the third", () => {
    expect(getWorldState(1, 10).skyGlow).toBe(true);
    expect(getWorldState(1, 10).rockUnlocked).toBe(false);
    expect(getWorldState(1, 20).rockUnlocked).toBe(false);
    expect(getWorldState(1, 30).rockUnlocked).toBe(true);
  });

  it("adds the first flower and the butterfly on Day 4", () => {
    expect(getWorldState(3, MAX_TOTAL_ENERGY).flowerUnlocked).toBe(false);
    expect(getWorldState(3, MAX_TOTAL_ENERGY).butterflyUnlocked).toBe(false);
    expect(getWorldState(4, 0).flowerUnlocked).toBe(true);
    expect(getWorldState(4, 0).butterflyUnlocked).toBe(true);
  });

  it("reveals the mystery gate on Day 6 but never opens it that day", () => {
    expect(getWorldState(5, MAX_TOTAL_ENERGY).mysteryGateUnlocked).toBe(false);
    expect(getWorldState(6, MAX_TOTAL_ENERGY).mysteryGateUnlocked).toBe(true);
    // The whole point of Day 6 is anticipation: it must not open.
    expect(getWorldState(6, MAX_TOTAL_ENERGY).newAreaUnlocked).toBe(false);
    expect(isMysteryGateOpen(6, MAX_TOTAL_ENERGY, 10)).toBe(false);
  });

  it("unlocks the new area on Day 7 for anyone who acts that day", () => {
    // Acting on the final day is the gate — not the size of the total. A child
    // who completed one goal a day still gets the ending the week promised.
    expect(getWorldState(7, 0, 10).newAreaUnlocked).toBe(true);
    expect(getWorldState(7, 60, 10).newAreaUnlocked).toBe(true);
    expect(getWorldState(7, 180, 10).newAreaUnlocked).toBe(true);
    // Day 6 can never unlock it, even at maximum energy.
    expect(getWorldState(6, MAX_TOTAL_ENERGY, 10).newAreaUnlocked).toBe(false);
  });

  it("requires a Day 7 action before the new area opens", () => {
    // A perfect student arrives on Day 7 with exactly 180 energy: the finale
    // must still be earned by completing one of that day's goals, so nothing
    // opens at the day rollover.
    expect(getWorldState(7, 180, 0).newAreaUnlocked).toBe(false);
    // Same rule for a student who did much less — the day alone is never enough.
    expect(getWorldState(7, 60, 0).newAreaUnlocked).toBe(false);
    expect(getWorldState(7, 180, 10).newAreaUnlocked).toBe(true);
  });

  it("gives every completion rate the same ending (P5)", () => {
    // The regression this exists for: a child on one goal a day used to reach
    // Day 7 and get nothing — the gate promised on Day 6 stayed shut forever,
    // while the home screen said the 7-day journey was complete.
    const onePerDay = 60; // six days x one goal
    const threePerDay = 180;
    expect(getWorldState(7, onePerDay, 10).newAreaUnlocked).toBe(
      getWorldState(7, threePerDay, 10).newAreaUnlocked,
    );
  });

  it("clamps out-of-range days", () => {
    expect(getWorldState(0, 0)).toEqual(getWorldState(1, 0));
    expect(getWorldState(100, 210, 10)).toEqual(getWorldState(7, 210, 10));
  });

  it("makes Day 1, Day 3 and Day 7 visibly different", () => {
    const day1 = getWorldState(1, 0);
    const day3 = getWorldState(3, 60);
    const day7 = getWorldState(7, 180, 10);

    // AC4: screenshots side by side must be distinguishable at a glance.
    expect(day1).not.toEqual(day3);
    expect(day3).not.toEqual(day7);
    expect(day1).not.toEqual(day7);
    expect(day7.newAreaUnlocked).toBe(true);
    expect(day7.mysteryGateUnlocked).toBe(true);
  });
});

describe("getCloudCount", () => {
  it("ramps up across the week", () => {
    expect(getCloudCount(1)).toBe(0);
    expect(getCloudCount(2)).toBe(1);
    expect(getCloudCount(3)).toBe(2);
    expect(getCloudCount(5)).toBe(3);
    expect(getCloudCount(7)).toBe(3);
  });
});
