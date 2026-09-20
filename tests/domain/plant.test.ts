import { describe, expect, it } from "vitest";
import { MAX_TOTAL_ENERGY } from "@/domain/constants";
import {
  energyToNextPlantState,
  getPlantState,
  PLANT_DAY_CAP,
  PLANT_STATE_ORDER,
} from "@/domain/plant";

describe("getPlantState", () => {
  it("starts as a seed with no energy", () => {
    expect(getPlantState(1, 0)).toBe("seed");
  });

  it("caps every day exactly at the documented stage", () => {
    const expected = {
      1: "sprout",
      2: "leaf",
      3: "young_plant",
      4: "young_plant",
      5: "bud",
      6: "tree",
      7: "bloom",
    } as const;

    for (const [day, state] of Object.entries(expected)) {
      // todayEnergy > 0 represents "the student acted today", which Day 7 needs.
      expect(getPlantState(Number(day), MAX_TOTAL_ENERGY, 10)).toBe(state);
      expect(PLANT_DAY_CAP[Number(day)]).toBe(state);
    }
  });

  it("only allows bloom on Day 7", () => {
    expect(getPlantState(6, MAX_TOTAL_ENERGY, 10)).toBe("tree");
    expect(getPlantState(7, MAX_TOTAL_ENERGY, 10)).toBe("bloom");
    expect(getPlantState(7, 180, 10)).toBe("bloom");
    expect(getPlantState(7, 179, 10)).toBe("tree");
  });

  it("requires Day 7 action before the bloom", () => {
    // A perfect student arrives on Day 7 with exactly 180 energy.
    expect(getPlantState(7, 180, 0)).toBe("tree");
    expect(getPlantState(7, 180, 10)).toBe("bloom");
    // Earlier days are unaffected by the participation gate.
    expect(getPlantState(3, 90, 0)).toBe("young_plant");
  });

  it("keeps Day 4 at young_plant so the flower is the day's real news", () => {
    expect(getPlantState(4, MAX_TOTAL_ENERGY, 10)).toBe("young_plant");
    expect(getPlantState(5, MAX_TOTAL_ENERGY, 10)).toBe("bud");
  });

  it("uses energy thresholds when they are below the day ceiling", () => {
    const at = (energy: number) => getPlantState(7, energy, 10);
    expect(at(9)).toBe("seed");
    expect(at(10)).toBe("sprout");
    expect(at(30)).toBe("leaf");
    expect(at(60)).toBe("young_plant");
    expect(at(90)).toBe("bud");
    expect(at(140)).toBe("tree");
  });

  it("clamps out-of-range days and energy", () => {
    expect(getPlantState(0, 60)).toBe(getPlantState(1, 60));
    expect(getPlantState(42, 210, 10)).toBe(getPlantState(7, 210, 10));
    expect(getPlantState(7, -10)).toBe("seed");
  });

  it("is a monotonic walk through the stage order", () => {
    const seen: string[] = [];
    for (let energy = 0; energy <= MAX_TOTAL_ENERGY; energy += 10) {
      const state = getPlantState(7, energy, 10);
      if (seen[seen.length - 1] !== state) seen.push(state);
    }
    expect(seen).toEqual([...PLANT_STATE_ORDER]);
  });
});

describe("energyToNextPlantState", () => {
  it("reports energy to the next stage", () => {
    expect(energyToNextPlantState(7, 0)).toEqual({
      next: "sprout",
      remaining: 10,
    });
    expect(energyToNextPlantState(7, 10)).toEqual({
      next: "leaf",
      remaining: 20,
    });
  });

  it("returns null when today's ceiling is reached", () => {
    expect(energyToNextPlantState(1, 10)).toBeNull();
    // Day 6 caps at tree, so bloom is a tomorrow conversation, not a number.
    expect(energyToNextPlantState(6, MAX_TOTAL_ENERGY, 10)).toBeNull();
    // Day 7 with full energy has nothing left to promise.
    expect(energyToNextPlantState(7, 180, 10)).toBeNull();
  });
});
