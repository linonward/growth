import { describe, expect, it } from "vitest";
import { describeRewardChange, detectDayMilestone } from "@/domain/reward";

describe("describeRewardChange", () => {
  it("gives every goal a reward", () => {
    for (let energy = 0; energy < 200; energy += 10) {
      const change = describeRewardChange(7, energy);
      expect(change.title.length).toBeGreaterThan(0);
      expect(change.from.length).toBeGreaterThan(0);
      expect(change.to.length).toBeGreaterThan(0);
    }
  });

  it("uses the light/energy beat when nothing structural changes", () => {
    // Day 2 at 10 -> 20: pet is at its Day 2 floor, plant has no step at 20,
    // and the rock is already out.
    const change = describeRewardChange(2, 10);
    expect(change.target).toBe("energy");
    expect(change.isMajor).toBe(false);
  });

  it("reports the pet hatching as a major moment", () => {
    const change = describeRewardChange(3, 50);
    expect(change.target).toBe("pet");
    expect(change.isMajor).toBe(true);
    expect(change.title).toContain("新的伙伴");
    expect(change.to).toBe("🐣");
  });

  it("reports Day 1's third goal as the rock appearing", () => {
    const change = describeRewardChange(1, 20);
    expect(change.target).toBe("world");
    expect(change.title).toContain("小石头");
  });

  it("reports the plant growing when the pet is capped", () => {
    const change = describeRewardChange(7, 80);
    expect(change.target).toBe("plant");
    expect(change.title).toContain("新叶子");
  });

  it("reports the Day 7 bloom as a major moment", () => {
    const change = describeRewardChange(7, 170);
    expect(change.target).toBe("plant");
    expect(change.isMajor).toBe(true);
    expect(change.title).toContain("开花");
  });

  it("varies the small reward copy instead of repeating one line", () => {
    const lines = new Set<string>();
    for (let energy = 0; energy < 200; energy += 10) {
      const change = describeRewardChange(2, energy);
      if (change.target === "energy") lines.add(change.detail);
    }
    expect(lines.size).toBeGreaterThan(1);
  });
});

describe("detectDayMilestone", () => {
  it("fires exactly when the pet is born", () => {
    expect(detectDayMilestone(3, 50)?.id).toBe("day3_pet_born");
    expect(detectDayMilestone(3, 60)).toBeNull();
    expect(detectDayMilestone(2, 20)).toBeNull();
  });

  it("fires the Day 7 finale when the new area unlocks", () => {
    expect(detectDayMilestone(7, 170)?.id).toBe("day7_finale");
    expect(detectDayMilestone(7, 160)).toBeNull();
  });

  it("does not fire the mystery gate from a goal completion", () => {
    // The gate is a day-rollover reveal, never a reward beat.
    for (let energy = 0; energy <= 210; energy += 10) {
      expect(detectDayMilestone(6, energy)?.id).not.toBe("day6_mystery_gate");
    }
  });
});
