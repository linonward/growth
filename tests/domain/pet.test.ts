import { describe, expect, it } from "vitest";
import { MAX_TOTAL_ENERGY } from "@/domain/constants";
import {
  energyToNextPetState,
  getPetState,
  isPetBorn,
  PET_DAY_CAP,
  PET_STATE_ORDER,
} from "@/domain/pet";

describe("getPetState — energy thresholds", () => {
  it("has no pet before any energy is earned", () => {
    expect(getPetState(1, 0)).toBe("egg");
  });

  it("maps energy to the documented thresholds once the day allows it", () => {
    // Day 7 with today's participation unlocked has the loosest gate, so it
    // exposes the raw energy thresholds.
    const at = (energy: number) => getPetState(7, energy, 10);
    expect(at(0)).toBe("egg");
    expect(at(9)).toBe("egg");
    expect(at(10)).toBe("wiggling_egg");
    expect(at(29)).toBe("wiggling_egg");
    expect(at(30)).toBe("cracked_egg");
    expect(at(59)).toBe("cracked_egg");
    expect(at(60)).toBe("baby");
    expect(at(119)).toBe("baby");
    expect(at(120)).toBe("young");
    expect(at(179)).toBe("young");
    expect(at(180)).toBe("evolved");
  });
});

describe("getPetState — Day Gate", () => {
  it("caps every day exactly at the documented state", () => {
    const expected = {
      1: "wiggling_egg",
      2: "cracked_egg",
      3: "baby",
      4: "baby",
      5: "young",
      6: "young",
      7: "evolved",
    } as const;

    for (const [day, state] of Object.entries(expected)) {
      // Even a perfect 210-energy student cannot outrun the day gate.
      // todayEnergy > 0 represents "the student acted today".
      expect(getPetState(Number(day), MAX_TOTAL_ENERGY, 10)).toBe(state);
      expect(PET_DAY_CAP[Number(day)]).toBe(state);
    }
  });

  it("requires Day 7 action before the finale evolution", () => {
    // A perfect student arrives on Day 7 with exactly 180 energy.
    expect(getPetState(7, 180, 0)).toBe("young");
    expect(getPetState(7, 180, 10)).toBe("evolved");
    // Days 1-6 are unaffected by the participation gate.
    expect(getPetState(3, 90, 0)).toBe("baby");
    expect(getPetState(5, 150, 0)).toBe("young");
  });

  it("does not let the pet hatch on Day 1", () => {
    expect(getPetState(1, 30)).toBe("wiggling_egg");
    expect(getPetState(1, MAX_TOTAL_ENERGY)).toBe("wiggling_egg");
    expect(isPetBorn(getPetState(1, MAX_TOTAL_ENERGY))).toBe(false);
  });

  it("lets the pet be born on Day 3", () => {
    expect(getPetState(3, 60)).toBe("baby");
    expect(isPetBorn(getPetState(3, 60))).toBe(true);
  });

  it("does not let the pet be born before Day 3 even at 210 energy", () => {
    expect(getPetState(2, MAX_TOTAL_ENERGY)).toBe("cracked_egg");
    expect(isPetBorn(getPetState(2, MAX_TOTAL_ENERGY))).toBe(false);
  });

  it("lets the pet reach young on Day 5", () => {
    expect(getPetState(5, 120)).toBe("young");
    expect(getPetState(4, MAX_TOTAL_ENERGY)).toBe("baby");
  });

  it("only allows evolved on Day 7", () => {
    expect(getPetState(6, MAX_TOTAL_ENERGY, 10)).toBe("young");
    expect(getPetState(7, 180, 10)).toBe("evolved");
    expect(getPetState(7, 179, 10)).toBe("young");
  });

  it("clamps out-of-range days into the 7-day window", () => {
    expect(getPetState(0, 60)).toBe(getPetState(1, 60));
    expect(getPetState(99, 210, 10)).toBe(getPetState(7, 210, 10));
    expect(getPetState(Number.NaN, 60)).toBe(getPetState(1, 60));
  });

  it("treats negative energy as zero", () => {
    expect(getPetState(7, -50)).toBe("egg");
  });
});

describe("energyToNextPetState", () => {
  it("reports the energy needed for the next state within today's gate", () => {
    expect(energyToNextPetState(1, 0)).toEqual({
      next: "wiggling_egg",
      remaining: 10,
    });
    expect(energyToNextPetState(3, 30)).toEqual({ next: "baby", remaining: 30 });
  });

  it("returns null once today's ceiling is reached", () => {
    // Day 1 caps at wiggling_egg, so 10 energy is already the ceiling.
    expect(energyToNextPetState(1, 10)).toBeNull();
    expect(energyToNextPetState(1, 210)).toBeNull();
  });

  it("never points past the day's ceiling", () => {
    // Day 2 caps at cracked_egg (30), so it must not promise baby.
    const next = energyToNextPetState(2, 10);
    expect(next).toEqual({ next: "cracked_egg", remaining: 20 });
    expect(energyToNextPetState(2, 30)).toBeNull();
  });

  it("is a monotonic walk through the state order", () => {
    const seen: string[] = [];
    for (let energy = 0; energy <= MAX_TOTAL_ENERGY; energy += 10) {
      const state = getPetState(7, energy, 10);
      if (seen[seen.length - 1] !== state) seen.push(state);
    }
    expect(seen).toEqual([...PET_STATE_ORDER]);
  });
});
