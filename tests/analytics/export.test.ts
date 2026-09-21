import { describe, expect, it } from "vitest";

import { buildExportPayload, buildPostWeekReport } from "@/analytics/export";
import type { AnalyticsEvent } from "@/domain/types";

/**
 * The post-week window is the primary acceptance point of the whole experiment:
 * D1–D7 retention during a 7-day serial mostly measures the serial, while coming
 * back on Day 8 — with nothing left to unlock — is the only clean signal that
 * the world change itself is the reason.
 *
 * `experiment_day` is clamped to 1–7 by design (there is no Day 8 in the game),
 * so this signal can only come from timestamps. That arithmetic is what these
 * tests pin: an off-by-one here would silently move every return by a day.
 */

const START = "2026-09-20T09:00:00.000Z";

/** An instant `days` after the start, plus an optional whole-hour offset. */
function at(startedAt: string, days: number, hourOffset = 0): string {
  const base = new Date(startedAt).getTime() + days * 86_400_000;
  return new Date(base + hourOffset * 3_600_000).toISOString();
}

function session(day: number, iso: string, ageBand?: string): AnalyticsEvent {
  return {
    id: `${day}-${iso}`,
    name: "session_started",
    day,
    at: iso,
    props: ageBand ? { age_band: ageBand } : {},
  };
}

describe("buildPostWeekReport", () => {
  it("ignores the seven days of the experiment", () => {
    const events = [0, 1, 2, 3, 4, 5, 6].map((offset) =>
      session(offset + 1, at(START, offset)),
    );
    const report = buildPostWeekReport(events, START);
    expect(report.daysActive).toBe(0);
    expect(report.firstDayActive).toBeNull();
    expect(report.lastDayActive).toBeNull();
    expect(report.byDay).toEqual({});
  });

  it("counts the first day after the story as offset 8", () => {
    // Day 7's session is 6 days after the start; the next calendar day is 7 days
    // after, which has to read as 8, not 7.
    const events = [session(7, at(START, 6)), session(7, at(START, 7))];
    const report = buildPostWeekReport(events, START);
    expect(report.daysActive).toBe(1);
    expect(report.firstDayActive).toBe(8);
    expect(report.lastDayActive).toBe(8);
    expect(report.byDay).toEqual({ "8": 1 });
  });

  it("keeps later days distinct and records how far the return went", () => {
    const events = [
      session(7, at(START, 7)),
      session(7, at(START, 8)),
      session(7, at(START, 13)),
    ];
    const report = buildPostWeekReport(events, START);
    expect(report.daysActive).toBe(3);
    expect(report.firstDayActive).toBe(8);
    expect(report.lastDayActive).toBe(14);
    expect(report.byDay).toEqual({ "8": 1, "9": 1, "14": 1 });
  });

  it("counts every opening on the same day", () => {
    const events = [
      session(7, at(START, 7, 1)),
      session(7, at(START, 7, 5)),
      session(7, at(START, 7, 9)),
    ];
    const report = buildPostWeekReport(events, START);
    expect(report.daysActive).toBe(1);
    expect(report.byDay).toEqual({ "8": 3 });
  });

  it("does not promote a late-evening day-7 session", () => {
    // 23:00 on Day 7 is still offset 7: the boundary is 24 hours from the start,
    // not a calendar date, so the child's own bedtime cannot shift the metric.
    const events = [session(7, at(START, 6, 23)), session(7, at(START, 7, -1))];
    expect(buildPostWeekReport(events, START).daysActive).toBe(0);
  });

  it("ignores events that are not app opens", () => {
    const events: AnalyticsEvent[] = [
      { id: "a", name: "world_viewed", day: 7, at: at(START, 9), props: {} },
      { id: "b", name: "goal_completed", day: 7, at: at(START, 9), props: {} },
    ];
    expect(buildPostWeekReport(events, START).daysActive).toBe(0);
  });

  it("survives a damaged start timestamp instead of throwing", () => {
    const events = [session(7, at(START, 8))];
    expect(buildPostWeekReport(events, "not-a-date").daysActive).toBe(0);
    expect(() => buildPostWeekReport(events, "")).not.toThrow();
  });

  it("is included in the export payload the analyser reads", () => {
    const payload = buildExportPayload({
      participantId: "p-1",
      profile: {
        worldName: "小光岛",
        petName: "小光",
        petSpecies: "fox",
        startedAt: START,
        ageBand: "6-7",
      },
      goalsByDay: {},
      checkIns: [],
      events: [session(7, at(START, 7))],
      day7Completed: true,
      totalEnergy: 180,
      currentDay: 7,
    });
    expect(payload.postWeek).toEqual({
      daysActive: 1,
      firstDayActive: 8,
      lastDayActive: 8,
      byDay: { "8": 1 },
    });
    // And the week itself is still reported separately.
    expect(payload.summary.dayRetention["7"]).toBe(true);
  });
});

/**
 * SAAR is the North Star, and its denominator is the easiest thing in the whole
 * experiment to get quietly wrong: counting only the children who answered
 * removes the group most likely to have been prompted.
 */
describe("selfInitiatedRate — the unanswered must stay in the denominator", () => {
  function build(events: AnalyticsEvent[]) {
    return buildExportPayload({
      participantId: "p-1",
      profile: {
        worldName: "小光岛",
        petName: "小光",
        petSpecies: "fox",
        startedAt: START,
        ageBand: "6-7",
      },
      goalsByDay: {},
      checkIns: [],
      events,
      day7Completed: false,
      totalEnergy: 0,
      currentDay: 3,
    });
  }

  const answer = (day: number, initiative: string): AnalyticsEvent => ({
    id: `i-${day}-${initiative}`,
    name: "initiative_answered",
    day,
    at: at(START, day - 1),
    props: { initiative },
  });

  it("is null when the question was never asked", () => {
    expect(build([]).summary.selfInitiatedRate).toBeNull();
  });

  it("is 1 when every answer was self", () => {
    const summary = build([answer(1, "self"), answer(2, "self")]).summary;
    expect(summary.selfInitiatedRate).toBe(1);
    expect(summary.initiativeUnanswered).toBe(0);
  });

  it("counts an explicit skip as asked-and-not-self", () => {
    // Two self and two skipped. Excluding the skips would report 100%.
    const summary = build([
      answer(1, "self"),
      answer(2, "self"),
      answer(3, "unanswered"),
      answer(4, "unanswered"),
    ]).summary;
    expect(summary.initiativeSelf).toBe(2);
    expect(summary.initiativeUnanswered).toBe(2);
    expect(summary.selfInitiatedRate).toBe(0.5);
  });

  it("reports all three outcomes separately", () => {
    const summary = build([
      answer(1, "self"),
      answer(2, "prompted"),
      answer(3, "unanswered"),
    ]).summary;
    expect(summary.initiativeSelf).toBe(1);
    expect(summary.initiativePrompted).toBe(1);
    expect(summary.initiativeUnanswered).toBe(1);
    expect(summary.selfInitiatedRate).toBeCloseTo(1 / 3);
  });

  it("carries the day's answer into the day report", () => {
    // The day report reads `checkIns`, which the store writes at the same time
    // as the event — the pairing is asserted in the store tests.
    const payload = buildExportPayload({
      participantId: "p-1",
      profile: {
        worldName: "小光岛",
        petName: "小光",
        petSpecies: "fox",
        startedAt: START,
        ageBand: "6-7",
      },
      goalsByDay: {},
      checkIns: [
        { day: 2, initiative: "unanswered", openedAt: at(START, 1) },
        { day: 3, initiative: "self", openedAt: at(START, 2) },
      ],
      events: [],
      day7Completed: false,
      totalEnergy: 0,
      currentDay: 3,
    });
    expect(payload.days.find((d) => d.day === 2)?.initiative).toBe("unanswered");
    expect(payload.days.find((d) => d.day === 3)?.initiative).toBe("self");
    expect(payload.days.find((d) => d.day === 4)?.initiative).toBeNull();
  });
});
