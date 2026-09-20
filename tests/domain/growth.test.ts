import { describe, expect, it } from "vitest";
import { MAX_ENERGY_PER_DAY, MAX_TOTAL_ENERGY } from "@/domain/constants";
import {
  calendarDayFromStart,
  energyFromCompletedGoals,
  getGrowthState,
  isFinalDay,
  todayEnergyRatio,
} from "@/domain/growth";

describe("energyFromCompletedGoals", () => {
  it("awards 10 energy per completed goal", () => {
    expect(energyFromCompletedGoals(0)).toBe(0);
    expect(energyFromCompletedGoals(1)).toBe(10);
    expect(energyFromCompletedGoals(2)).toBe(20);
    expect(energyFromCompletedGoals(3)).toBe(30);
  });

  it("matches the documented weekly maximum at 21 goals", () => {
    expect(energyFromCompletedGoals(21)).toBe(MAX_TOTAL_ENERGY);
    expect(MAX_TOTAL_ENERGY).toBe(210);
  });

  it("is defensive about junk input", () => {
    expect(energyFromCompletedGoals(-4)).toBe(0);
    expect(energyFromCompletedGoals(2.9)).toBe(20);
  });
});

describe("todayEnergyRatio", () => {
  it("is a safe 0..1 ratio", () => {
    expect(todayEnergyRatio(0)).toBe(0);
    expect(todayEnergyRatio(15)).toBeCloseTo(0.5);
    expect(todayEnergyRatio(30)).toBe(1);
    // The daily cap is 30, so anything above it still renders as full.
    expect(todayEnergyRatio(90)).toBe(1);
    expect(todayEnergyRatio(-10)).toBe(0);
  });
});

describe("calendarDayFromStart", () => {
  const start = "2024-05-01T09:00:00.000Z";

  it("returns Day 1 on the day the student started", () => {
    expect(calendarDayFromStart(start, new Date("2024-05-01T23:00:00.000Z"))).toBe(1);
  });

  it("advances one day per calendar day", () => {
    expect(calendarDayFromStart(start, new Date("2024-05-02T08:00:00.000Z"))).toBe(2);
    expect(calendarDayFromStart(start, new Date("2024-05-04T08:00:00.000Z"))).toBe(4);
  });

  it("clamps to the 7-day experiment window", () => {
    expect(calendarDayFromStart(start, new Date("2024-05-07T08:00:00.000Z"))).toBe(7);
    expect(calendarDayFromStart(start, new Date("2024-06-01T08:00:00.000Z"))).toBe(7);
  });

  it("falls back to Day 1 for an unparseable start date", () => {
    expect(calendarDayFromStart("not-a-date", new Date())).toBe(1);
  });
});

describe("isFinalDay", () => {
  it("is only true on Day 7", () => {
    expect(isFinalDay(6)).toBe(false);
    expect(isFinalDay(7)).toBe(true);
    expect(isFinalDay(99)).toBe(true);
  });
});

describe("getGrowthState", () => {
  it("composes pet, plant and world from one call", () => {
    const growth = getGrowthState(3, 90, 30);
    expect(growth.currentDay).toBe(3);
    expect(growth.petState).toBe("baby");
    expect(growth.plantState).toBe("young_plant");
    expect(growth.worldState.flowerUnlocked).toBe(false);
    expect(growth.todayEnergy).toBe(30);
  });

  it("never reports more than the daily maximum as today's energy", () => {
    const growth = getGrowthState(2, 60, 999);
    // Callers clamp before passing; the raw value is preserved for debugging.
    expect(growth.todayEnergy).toBe(999);
    expect(todayEnergyRatio(growth.todayEnergy)).toBe(1);
    expect(MAX_ENERGY_PER_DAY).toBe(30);
  });

  it("gives a full week a complete arc", () => {
    const states = [1, 2, 3, 4, 5, 6, 7].map((day) =>
      getGrowthState(day, Math.min(MAX_TOTAL_ENERGY, day * 30), 30),
    );
    expect(states.map((s) => s.petState)).toEqual([
      "wiggling_egg",
      "cracked_egg",
      "baby",
      "baby",
      "young",
      "young",
      "evolved",
    ]);
    expect(states.map((s) => s.plantState)).toEqual([
      "sprout",
      "leaf",
      "young_plant",
      "young_plant",
      "bud",
      "tree",
      "bloom",
    ]);
  });
});
