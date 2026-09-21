import type { AgeBand } from "./types";

/**
 * The age-band options the experimenter records before handing the device over.
 *
 * Bands are one school year wide on purpose: the analysis question is "does this
 * work at 6 the way it works at 11", and a one-year band means every player in a
 * band is in the same grade. (Phase 0 v1 was 8–12; v2 covers 6–12.)
 *
 * This list is the single source of truth — both the debug picker and the debug
 * validation read it, so a band can never be recorded that the analysis does not
 * know about.
 */
export const AGE_BANDS: readonly AgeBand[] = [
  "6-7",
  "7-8",
  "8-9",
  "9-10",
  "10-11",
  "11-12",
] as const;

export interface AgeBandOption {
  id: AgeBand;
  /** Shown next to the band in the debug picker. */
  label: string;
}

export const AGE_BAND_OPTIONS: readonly AgeBandOption[] = [
  { id: "6-7", label: "一年级" },
  { id: "7-8", label: "二年级" },
  { id: "8-9", label: "三年级" },
  { id: "9-10", label: "四年级" },
  { id: "10-11", label: "五年级" },
  { id: "11-12", label: "六年级" },
] as const;

/** Narrow an arbitrary value (a `?age_band=` param, persisted JSON) to a band. */
export function parseAgeBand(value: unknown): AgeBand | null {
  if (typeof value !== "string") return null;
  return (AGE_BANDS as readonly string[]).includes(value) ? (value as AgeBand) : null;
}

export function ageBandLabel(band: AgeBand | null | undefined): string {
  if (!band) return "未记录";
  return AGE_BAND_OPTIONS.find((o) => o.id === band)?.label ?? band;
}
