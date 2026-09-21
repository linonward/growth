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
    // Day 5, pet already at its Day 5 cap, plant steps 80 -> 90.
    const change = describeRewardChange(5, 80, "小光", 20);
    expect(change.target).toBe("plant");
    expect(change.title).toContain("新叶子");
  });

  it("leads with the gate opening on Day 7, ahead of the bloom", () => {
    // Spec section 11 plays the closing beat as ONE moment after the final
    // task. A student crossing 180 total energy on that goal would otherwise
    // get bloom -> evolved and never be told the door had opened.
    const change = describeRewardChange(7, 170);
    expect(change.target).toBe("world");
    expect(change.isMajor).toBe(true);
    expect(change.title).toContain("门后的世界打开了");
  });

  it("still gives a low-completion child a Day 7 ending", () => {
    // One goal a day = 60 energy entering Day 7. The plant does not bloom and
    // the pet does not evolve at that total — but the ending, the thing Day 6
    // promised, must still land.
    const change = describeRewardChange(7, 60);
    expect(change.target).toBe("world");
    expect(change.isMajor).toBe(true);
    expect(change.title).toContain("门后的世界打开了");
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

  it("fires the Day 7 finale whenever a Day 7 action opens the door", () => {
    // Acting on the final day is the trigger, at any total: this is now the same
    // condition as the new area unlocking, so 160 and 170 both count.
    expect(detectDayMilestone(7, 170)?.id).toBe("day7_finale");
    expect(detectDayMilestone(7, 60)?.id).toBe("day7_finale");
    // No action that day (todayEnergyAfter defaults to 0 here) = no finale.
    expect(detectDayMilestone(7, 170, "小光", 0)).toBeNull();
    // Day 6, at any energy: still only the reveal, never the opening.
    expect(detectDayMilestone(6, 200)).toBeNull();
  });

  it("does not fire the mystery gate from a goal completion", () => {
    // The gate is a day-rollover reveal, never a reward beat.
    for (let energy = 0; energy <= 210; energy += 10) {
      expect(detectDayMilestone(6, energy)?.id).not.toBe("day6_mystery_gate");
    }
  });
});
