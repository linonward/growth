import { describe, expect, it } from "vitest";

import {
  analyse,
  cohortByAge,
  type RawExport,
  renderAgeCohorts,
  renderParticipant,
  renderSummary,
  resolveAgeBand,
} from "../../scripts/analyze-export.ts";

/**
 * The analyser decides whether Phase 0's behaviour data can be trusted at all,
 * so its signals need to be right — an inverted flag would either dismiss real
 * tapping or slander an honest student.
 */

/**
 * The child's timezone. Fixed in the fixture so these tests give the same answer
 * on a developer machine in China and a UTC CI runner — which is exactly the bug
 * CI caught.
 */
const CST = -480;

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
    timezoneOffsetMinutes: CST,
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
    timezoneOffsetMinutes: CST,
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

describe("analyse — time of day is the child's, not the analyst's", () => {
  it("reads the same hours regardless of this machine's timezone", () => {
    // Same data, and the signal must not move when the analyser runs elsewhere.
    const r = analyse(tapper());
    expect(r.oddHourCount).toBeGreaterThan(0);
  });

  it("does not flag school goals done during the school day", () => {
    const r = analyse(honest());
    expect(r.schoolCount).toBeGreaterThan(0);
    expect(r.oddHourCount).toBe(0);
  });

  it("treats a 21:00 CST completion as late even when analysed from UTC", () => {
    // 21:30 CST is 13:30 UTC — the distinction the naive getHours() lost.
    const raw = tapper();
    expect(raw.timezoneOffsetMinutes).toBe(CST);
    const r = analyse(raw);
    expect(r.oddHourCount / r.schoolCount).toBeGreaterThan(0.2);
  });

  it("falls back to this machine's offset when the export predates the field", () => {
    const raw = tapper();
    raw.timezoneOffsetMinutes = undefined;
    // Must not throw, whatever the runner's timezone is.
    expect(() => analyse(raw)).not.toThrow();
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

  it("does not put 'animation was skipped' next to a ✅", () => {
    // The table is pasted into the report verbatim, so the remark has to match
    // the flag it sits behind.
    const line =
      renderParticipant(analyse(honest()))
        .split("\n")
        .find((l) => l.startsWith("| reward 观看")) ?? "";
    expect(line).toContain("✅");
    expect(line).not.toContain("被跳过");
  });

  it("says it cannot judge when there are no reward views at all", () => {
    const raw = honest();
    raw.events = raw.events.filter((e) => e.name !== "reward_viewed");
    const line =
      renderParticipant(analyse(raw))
        .split("\n")
        .find((l) => l.startsWith("| reward 观看")) ?? "";
    expect(line).toContain("无法判读");
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

/* -------------------------------------------------------------- age bands */

/** The same export, attributed to an age band, with a chosen watch depth. */
function withBand(
  raw: RawExport,
  ageBand: string | null,
  stagesSeen: number,
  id = raw.participantId,
): RawExport {
  return {
    ...raw,
    participantId: id,
    profile: ageBand === null ? {} : { ageBand },
    events: raw.events.map((e) =>
      e.name === "reward_viewed"
        ? { ...e, props: { ...e.props, stages_seen: stagesSeen } }
        : e,
    ),
  };
}

describe("resolveAgeBand — never invents a cohort", () => {
  it("reads the band from the profile", () => {
    expect(resolveAgeBand(withBand(honest(), "6-7", 4))).toBe("6-7");
  });

  it("falls back to the common event property", () => {
    const raw = withBand(honest(), null, 4);
    raw.events = raw.events.map((e) => ({
      ...e,
      props: { ...e.props, age_band: "9-10" },
    }));
    expect(resolveAgeBand(raw)).toBe("9-10");
  });

  it("prefers the profile when both are present", () => {
    const raw = withBand(honest(), "6-7", 4);
    raw.events = raw.events.map((e) => ({
      ...e,
      props: { ...e.props, age_band: "9-10" },
    }));
    expect(resolveAgeBand(raw)).toBe("6-7");
  });

  it("treats v1 exports without any band field as unrecorded", () => {
    expect(resolveAgeBand(honest())).toBeNull();
    expect(analyse(honest()).ageBand).toBeNull();
  });

  it("treats an unknown band as unrecorded rather than forming a phantom cohort", () => {
    // A typo or a hand-edited file must not become a row of its own.
    expect(resolveAgeBand(withBand(honest(), "5-6", 4))).toBeNull();
    expect(resolveAgeBand(withBand(honest(), "grade-1", 4))).toBeNull();
  });
});

describe("cohortByAge — pooling ages would hide the effect", () => {
  it("averages stages_seen per band instead of across everyone", () => {
    const reports = [
      analyse(withBand(honest(), "6-7", 1, "a")),
      analyse(withBand(honest(), "6-7", 2, "b")),
      analyse(withBand(honest(), "11-12", 4, "c")),
      analyse(withBand(honest(), "11-12", 4, "d")),
    ];
    const cohorts = cohortByAge(reports);

    const young = cohorts.find((c) => c.ageBand === "6-7");
    const old = cohorts.find((c) => c.ageBand === "11-12");
    expect(young?.participants).toBe(2);
    expect(young?.averageStagesSeen).toBe(1.5);
    expect(old?.averageStagesSeen).toBe(4);

    // The pooled number is 2.75 — above the 2.5 floor, so it would have declared
    // the beat "seen" while the entire 6-7 cohort never watched it. This is the
    // exact failure the per-band table exists to prevent.
    const pooled = reports.flatMap((r) => r.stagesSeen);
    expect(pooled.reduce((a, b) => a + b, 0) / pooled.length).toBeGreaterThan(2.5);
    expect(young?.averageStagesSeen).toBeLessThan(2.5);
  });

  it("keeps unsegmented participants in their own row", () => {
    const reports = [
      analyse(withBand(honest(), "6-7", 4, "a")),
      analyse(withBand(honest(), null, 4, "b")),
    ];
    const cohorts = cohortByAge(reports);

    expect(cohorts.map((c) => c.ageBand)).toEqual(["6-7", null]);
    expect(cohorts.find((c) => c.ageBand === null)?.participants).toBe(1);
  });

  it("orders bands from youngest to oldest, with unsegmented last", () => {
    const reports = ["11-12", "6-7", "9-10", null].map((band, i) =>
      analyse(withBand(honest(), band, 4, `p${i}`)),
    );
    expect(cohortByAge(reports).map((c) => c.ageBand)).toEqual([
      "6-7",
      "9-10",
      "11-12",
      null,
    ]);
  });

  it("reports null rather than 0 when a cohort has no reward views", () => {
    const raw = withBand(honest(), "6-7", 4);
    raw.events = raw.events.filter((e) => e.name !== "reward_viewed");
    const cohort = cohortByAge([analyse(raw)])[0];
    expect(cohort.rewardViews).toBe(0);
    expect(cohort.averageStagesSeen).toBeNull();
  });
});

describe("renderAgeCohorts — says what the data cannot answer", () => {
  it("refuses to judge a cohort of one", () => {
    const out = renderAgeCohorts(
      cohortByAge([analyse(withBand(honest(), "6-7", 1, "a"))]),
    );
    expect(out).toContain("样本不足");
    // The point of the warning: no ✅/⚠️ verdict on an anecdote.
    expect(out).not.toContain("动画基本被跳过");
  });

  it("flags a sufficiently sampled band whose animation is skipped", () => {
    const reports = [
      analyse(withBand(honest(), "6-7", 1, "a")),
      analyse(withBand(honest(), "6-7", 2, "b")),
    ];
    const out = renderAgeCohorts(cohortByAge(reports));
    expect(out).toContain("一年级");
    expect(out).toContain("动画基本被跳过");
  });

  it("does not pass an unsegmented average off as an age group", () => {
    const reports = [
      analyse(withBand(honest(), null, 4, "a")),
      analyse(withBand(honest(), null, 4, "b")),
    ];
    const out = renderAgeCohorts(cohortByAge(reports));
    expect(out).toContain("不能当作任何一个年龄组");
  });

  it("warns loudly about how much of the sample cannot be segmented", () => {
    const reports = [
      analyse(withBand(honest(), "6-7", 4, "a")),
      analyse(withBand(honest(), null, 4, "b")),
    ];
    const out = renderAgeCohorts(cohortByAge(reports));
    expect(out).toContain("1/2 位参与者**没有年龄记录**");
  });

  it("stays readable when there are no participants at all", () => {
    expect(renderAgeCohorts([])).toContain("没有参与者");
  });
});

describe("renderSummary — the pooled table claims less, not more", () => {
  const totals = {
    burstPairs: 0,
    totalPairs: 10,
    shortfallCount: 0,
    shortfallChecked: 10,
    oddHourCount: 0,
    schoolCount: 10,
    stagesSeen: [4, 4, 1, 1],
  };

  it("refuses to give the mixed-age reward average a verdict", () => {
    const line =
      renderSummary(totals, 4)
        .split("\n")
        .find((l) => l.startsWith("| reward 观看")) ?? "";
    // 2.5 pooled, from a 4 and a 1 cohort — a flag here would read as "fine".
    expect(line).toContain("混龄均值");
    expect(line).not.toContain("✅");
    expect(line).not.toContain("⚠️");
  });

  it("still reports the credibility signals, which are age-independent", () => {
    const out = renderSummary(totals, 4);
    expect(out).toContain("| 连点率 |");
    expect(out).toContain("| 时长不足 |");
    expect(out).toContain("| 时段异常 |");
  });
});

describe("renderParticipant — the age band is visible per participant", () => {
  it("names the band and its school year", () => {
    const out = renderParticipant(analyse(withBand(honest(), "6-7", 4)));
    expect(out).toContain("年龄组 6-7（一年级）");
  });

  it("says the band is missing instead of leaving it out", () => {
    // An unrecorded band has to be visible on the participant line, otherwise
    // the cohort table's "unsegmented" row looks like a rounding error.
    const out = renderParticipant(analyse(honest()));
    expect(out).toContain("年龄未记录");
  });
});
