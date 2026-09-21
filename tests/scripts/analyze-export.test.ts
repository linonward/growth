import { describe, expect, it } from "vitest";

import {
  analyse,
  type RawExport,
  renderParticipant,
} from "../../scripts/analyze-export.ts";

/**
 * The analyser decides whether Phase 0's behaviour data can be trusted at all,
 * so its signals need to be right — an inverted flag would either dismiss real
 * tapping or slander an honest student.
 */

/** Local (UTC+8) wall-clock time on the given experiment day. */
const T = (day: number, hour: number, minute: number, second = 0) =>
  new Date(Date.UTC(2026, 8, 20 + day, hour - 8, minute, second)).toISOString();

let seq = 0;
function ev(
  name: string,
  day: number,
  at: string,
  props: Record<string, string | number | boolean | null> = {},
) {
  return { id: `e${seq++}`, name, day, at, props };
}

/** A student who actually does the work over the evening. */
function honest(): RawExport {
  seq = 0;
  const events = [];
  for (let day = 1; day <= 7; day++) {
    events.push(ev("session_started", day, T(day, 17, 0)));
    events.push(ev("goal_selected", day, T(day, 17, 5), { goal_type: "math" }));
    events.push(ev("goal_completed", day, T(day, 17, 35), { goal_type: "math" }));
    events.push(ev("goal_completed", day, T(day, 18, 10), { goal_type: "chinese" }));
    events.push(ev("goal_completed", day, T(day, 18, 50), { goal_type: "english" }));
    events.push(
      ev("reward_viewed", day, T(day, 17, 36), {
        goal_type: "math",
        stages_seen: 4,
      }),
    );
    // A school goal, during school hours.
    events.push(ev("goal_completed", day, T(day, 15, 30), { goal_type: "participate" }));
  }
  return {
    schemaVersion: 1,
    exportedAt: T(7, 22, 0),
    participantId: "honest-0000",
    events,
  };
}

/** A student who discovered tapping through in seconds, late at night. */
function tapper(): RawExport {
  seq = 0;
  const events = [];
  for (let day = 1; day <= 7; day++) {
    events.push(ev("session_started", day, T(day, 21, 28)));
    for (const goal of ["math", "chinese", "english"]) {
      events.push(ev("goal_selected", day, T(day, 21, 29), { goal_type: goal }));
    }
    events.push(ev("goal_completed", day, T(day, 21, 30, 0), { goal_type: "math" }));
    events.push(ev("goal_completed", day, T(day, 21, 30, 4), { goal_type: "chinese" }));
    events.push(ev("goal_completed", day, T(day, 21, 30, 9), { goal_type: "english" }));
    events.push(
      ev("reward_viewed", day, T(day, 21, 30, 12), { goal_type: "math", stages_seen: 1 }),
    );
    // The same school goal, tapped at 21:32.
    events.push(ev("goal_completed", day, T(day, 21, 32), { goal_type: "participate" }));
  }
  return {
    schemaVersion: 1,
    exportedAt: T(7, 22, 0),
    participantId: "tapper-0000",
    events,
  };
}

describe("analyse — separates doing from tapping", () => {
  it("leaves an honest student unflagged", () => {
    const r = analyse(honest());
    const burstRate = r.burstPairs / Math.max(1, r.totalPairs);
    const oddHourRate = r.oddHourCount / Math.max(1, r.schoolCount);
    expect(burstRate).toBeLessThanOrEqual(0.2);
    expect(oddHourRate).toBeLessThanOrEqual(0.2);
    expect(r.shortfallCount).toBe(0);
  });

  it("flags a tapping student on bursts and hours", () => {
    const r = analyse(tapper());
    expect(r.burstPairs / r.totalPairs).toBeGreaterThan(0.2);
    expect(r.oddHourCount / r.schoolCount).toBeGreaterThan(0.2);
    // The whole day's work is squeezed into minutes, against 35 declared minutes.
    const tight = r.tightestDay;
    expect(tight).not.toBeNull();
    expect(tight?.declaredMinutes).toBe(35);
    expect(tight?.spanMs).toBeLessThan((tight?.declaredMinutes ?? 0) * 60_000 * 0.5);
  });

  it("separates selection→completion shortfall", () => {
    const raw = honest();
    // math declared 15 minutes, completed 20 seconds after selecting it
    raw.events = raw.events.map((e) =>
      e.name === "goal_completed" && e.props?.goal_type === "math"
        ? { ...e, at: T(e.day, 17, 5, 20) }
        : e,
    );
    const r = analyse(raw);
    expect(r.shortfallCount).toBeGreaterThan(0);
  });
});

describe("analyse — single-completion days", () => {
  it("does not report a zero-length span as if it were evidence", () => {
    const raw = honest();
    // Keep only one completion for the whole week.
    let kept = false;
    raw.events = raw.events.filter((e) => {
      if (e.name !== "goal_completed") return true;
      if (kept) return false;
      kept = true;
      return true;
    });
    const r = analyse(raw);
    expect(r.completions).toBe(1);
    expect(r.tightestDay).toBeNull();
    const out = renderParticipant(r);
    expect(out).not.toContain("最短单日跨度");
  });
});

describe("analyse — reward animation", () => {
  it("records how many stages were actually watched", () => {
    expect(analyse(honest()).stagesSeen.every((s) => s === 4)).toBe(true);
    expect(analyse(tapper()).stagesSeen.every((s) => s === 1)).toBe(true);
  });

  it("ignores events without stages_seen rather than counting them as zero", () => {
    const raw = honest();
    raw.events = raw.events.map((e) =>
      e.name === "reward_viewed" ? { ...e, props: { goal_type: "math" } } : e,
    );
    expect(analyse(raw).stagesSeen).toEqual([]);
  });
});

describe("renderParticipant — flags point the right way", () => {
  it("does not accuse the honest student on reward watching", () => {
    const out = renderParticipant(analyse(honest()));
    const line = out.split("\n").find((l) => l.startsWith("| reward 观看")) ?? "";
    expect(line).toContain("✅");
  });

  it("flags the tapping student on reward watching", () => {
    const out = renderParticipant(analyse(tapper()));
    const line = out.split("\n").find((l) => l.startsWith("| reward 观看")) ?? "";
    expect(line).toContain("⚠️");
  });

  it("only treats 100% completion as suspicious when bursts corroborate it", () => {
    const honestLine =
      renderParticipant(analyse(honest()))
        .split("\n")
        .find((l) => l.startsWith("| 零波动")) ?? "";
    const tapperLine =
      renderParticipant(analyse(tapper()))
        .split("\n")
        .find((l) => l.startsWith("| 零波动")) ?? "";
    // both are 7/7, but only the one with bursts is called out
    expect(honestLine).toContain("✅");
    expect(tapperLine).toContain("⚠️");
  });

  it("marks the tight single-day span as suspicious", () => {
    const line =
      renderParticipant(analyse(tapper()))
        .split("\n")
        .find((l) => l.startsWith("| 最短单日跨度")) ?? "";
    expect(line).toContain("⚠️");
  });
});
