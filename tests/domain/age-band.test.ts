import { describe, expect, it } from "vitest";

import {
  AGE_BAND_OPTIONS,
  AGE_BANDS,
  ageBandLabel,
  parseAgeBand,
} from "@/domain/age-band";

/**
 * The age band is the only new dimension Phase 0 v2 adds for the 6–12 study, so
 * it gets the same treatment as the goal library: the analysis reads it, and a
 * value the analysis does not know about must be impossible to record.
 */
describe("age band options", () => {
  it("covers every band the type allows, and nothing else", () => {
    expect(AGE_BAND_OPTIONS.map((o) => o.id)).toEqual([...AGE_BANDS]);
  });

  it("spans 6–12 as one-school-year bands so each band is one grade", () => {
    expect(AGE_BANDS[0]).toBe("6-7");
    expect(AGE_BANDS.at(-1)).toBe("11-12");
    for (const band of AGE_BANDS) {
      const [low, high] = band.split("-").map(Number);
      expect(high - low).toBe(1);
    }
  });

  it("labels every band with its school year", () => {
    for (const option of AGE_BAND_OPTIONS) {
      expect(option.label).toMatch(/年级$/);
    }
  });
});

describe("parseAgeBand", () => {
  it("accepts every declared band", () => {
    for (const band of AGE_BANDS) expect(parseAgeBand(band)).toBe(band);
  });

  it("rejects anything the analysis cannot segment on", () => {
    // A `?age_band=` param and persisted JSON are both untrusted input; an
    // unknown value must become "unrecorded", never a phantom cohort.
    for (const bad of ["", "6", "5-6", "12-13", "grade-1", "6–7", null, 7, {}]) {
      expect(parseAgeBand(bad)).toBeNull();
    }
  });
});

describe("ageBandLabel", () => {
  it("shows an explicit unrecorded state rather than an empty cell", () => {
    expect(ageBandLabel(null)).toBe("未记录");
    expect(ageBandLabel(undefined)).toBe("未记录");
    expect(ageBandLabel("6-7")).toBe("一年级");
  });
});
