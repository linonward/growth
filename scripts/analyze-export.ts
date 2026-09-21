/**
 * Phase 0 data-credibility analyser.
 *
 *   node scripts/analyze-export.ts <export.json> [more.json ...]
 *
 * Reads the JSON produced by /debug/export (or "Download Experiment Data") and
 * reports whether the goal data can be trusted, then prints a markdown block
 * that can be pasted straight into the experiment report.
 *
 * Why this exists
 * ---------------
 * Every school goal (举手回答, 问老师, 先举手) is self-reported by the child.
 * There is no teacher view and no verification, by design — adding either would
 * break the no-failure rule and the student-first framing.
 *
 * The consequence is that "the child churned because the world was not
 * compelling" and "the child churned because they had already discovered they
 * could tap through without doing anything" look **identical** in the metrics.
 * These four signals separate them, and they need no new instrumentation: the
 * timestamps are already in the event log.
 *
 * No imports from the app's aliased modules, so this runs on plain `node`.
 */

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { GOAL_TEMPLATES } from "../src/data/goals.ts";

/* ------------------------------------------------------------------ types */

type EventProps = Record<string, string | number | boolean | null>;

interface RawEvent {
  name: string;
  day: number;
  at: string;
  props?: EventProps;
}

export interface RawExport {
  schemaVersion: number;
  exportedAt: string;
  participantId: string;
  /** See ExperimentExport.timezoneOffsetMinutes. Falls back to this machine. */
  timezoneOffsetMinutes?: number;
  /**
   * The participant's age band, recorded by the experimenter (one school year
   * wide — see `src/domain/age-band.ts`). Optional: v1 exports and any data
   * collected before the field existed do not have it. Absent means
   * "unsegmented", never a guess.
   */
  profile?: { ageBand?: string | null };
  summary?: Record<string, unknown>;
  events: RawEvent[];
}

/**
 * The age bands the report knows how to name.
 *
 * Deliberately duplicated from `src/domain/age-band.ts` instead of imported:
 * this script runs on plain node with no aliases and must keep working when it
 * is handed a file produced by an older or modified build. The duplication is
 * safe in one direction only — this list *validates*, it never invents, so an
 * unknown band degrades to "unsegmented" rather than silently forming a cohort
 * nobody defined.
 */
const AGE_BANDS = ["6-7", "7-8", "8-9", "9-10", "10-11", "11-12"] as const;

/** Labels for the cohort table, so a row reads as a grade and not a range. */
const AGE_BAND_LABELS: Record<string, string> = {
  "6-7": "一年级",
  "7-8": "二年级",
  "8-9": "三年级",
  "9-10": "四年级",
  "10-11": "五年级",
  "11-12": "六年级",
};

/**
 * Below this many participants, a cohort is reported but not judged.
 *
 * One child is an anecdote: averaging a single 6-year-old's `stages_seen` and
 * printing it next to a 12-year-old's creates a false comparison, which is
 * exactly the mistake this section exists to prevent.
 */
const MIN_COHORT_SIZE = 2;

/**
 * `stages_seen` below this means the behaviour → world change beat was skipped.
 * Same threshold `renderParticipant` uses for the per-participant signal.
 */
const STAGES_SEEN_FLOOR = 2.5;

/* --------------------------------------------------------------- constants */

/** Two completions closer together than this cannot both be real. */
const BURST_GAP_MS = 15_000;

/** Below this fraction of the declared duration, the goal cannot have been done. */
const DURATION_SHORTFALL = 0.5;

/** School behaviour cannot plausibly be completed at these hours. */
const SCHOOL_UNLIKELY_HOUR_START = 20;
const SCHOOL_UNLIKELY_HOUR_END = 6;

const SCHOOL_CATEGORIES = new Set([
  "participate",
  "ask_teacher",
  "stay_seated",
  "attend",
]);

const TEMPLATE_BY_ID = new Map(GOAL_TEMPLATES.map((t) => [t.id, t]));

/** "15 分钟" -> 15. Returns null for amounts that are not durations. */
function declaredMinutes(templateId: string): number | null {
  const amount = TEMPLATE_BY_ID.get(templateId)?.amount;
  if (!amount) return null;
  const match = amount.match(/(\d+)\s*分钟/);
  return match ? Number(match[1]) : null;
}

/**
 * Local hour of day in the *child's* timezone.
 *
 * `at` is stored as UTC, so the naive `getHours()` reads the analyst's clock —
 * which silently reported zero suspicious hours when run outside China.
 */
function localHour(at: number, offsetMinutes: number): number {
  return new Date(at - offsetMinutes * 60_000).getUTCHours();
}

function isSchoolGoal(templateId: string): boolean {
  const category = TEMPLATE_BY_ID.get(templateId)?.category;
  return category ? SCHOOL_CATEGORIES.has(category) : false;
}

/* ------------------------------------------------------------- signal calc */

interface GoalCompletion {
  templateId: string;
  day: number;
  at: number;
}

export interface ParticipantReport {
  participantId: string;
  /** `null` when the export does not say — reported as unsegmented, not guessed. */
  ageBand: string | null;
  daysActive: number;
  completions: number;

  /** Signal 1 — rapid-fire completions. */
  burstPairs: number;
  totalPairs: number;

  /** Signal 2 — completed sooner than the goal could possibly take. */
  shortfallCount: number;
  shortfallChecked: number;

  /** Signal 3 — school goals completed at implausible hours. */
  oddHourCount: number;
  schoolCount: number;

  /** Signal 4 — every selected goal completed, every day. */
  perfectDays: number;
  daysWithSelection: number;

  /** Signal 5 — the tightest single-day completion span vs the declared total. */
  tightestDay: { day: number; spanMs: number; declaredMinutes: number } | null;

  /** Reward animation: did anyone actually watch it? */
  stagesSeen: number[];
}

/**
 * Which age band this export belongs to.
 *
 * Prefers `profile.ageBand` (the field the analysis is built on) and falls back
 * to the common event property, because the two are written on different code
 * paths and a band recorded mid-session only reaches the events that follow it.
 * An unrecognised value is treated as unrecorded: a typo must not create a
 * cohort, and it must not be silently dropped either — it lands in the
 * "unsegmented" row where the analyst can see it.
 */
export function resolveAgeBand(raw: RawExport): string | null {
  const fromProfile = raw.profile?.ageBand ?? null;
  if (fromProfile && (AGE_BANDS as readonly string[]).includes(fromProfile)) {
    return fromProfile;
  }
  for (const event of raw.events) {
    const value = event.props?.age_band;
    if (typeof value === "string" && (AGE_BANDS as readonly string[]).includes(value)) {
      return value;
    }
  }
  return null;
}

export function analyse(raw: RawExport): ParticipantReport {
  const events = [...raw.events].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
  const ageBand = resolveAgeBand(raw);
  const completions: GoalCompletion[] = [];
  for (const event of events) {
    if (event.name !== "goal_completed") continue;
    const templateId = String(event.props?.goal_type ?? "");
    if (!templateId) continue;
    completions.push({ templateId, day: event.day, at: new Date(event.at).getTime() });
  }

  /* 1. burst pairs -------------------------------------------------------- */
  let burstPairs = 0;
  for (let i = 1; i < completions.length; i++) {
    if (completions[i].at - completions[i - 1].at < BURST_GAP_MS) burstPairs++;
  }
  const totalPairs = Math.max(0, completions.length - 1);

  /* 2. duration shortfall ------------------------------------------------- */
  // Compare each completion against the *selection* of that goal on that day.
  const selectedAt = new Map<string, number>();
  for (const event of events) {
    if (event.name !== "goal_selected") continue;
    const templateId = String(event.props?.goal_type ?? "");
    const key = `${event.day}:${templateId}`;
    if (!selectedAt.has(key)) selectedAt.set(key, new Date(event.at).getTime());
  }
  let shortfallCount = 0;
  let shortfallChecked = 0;
  for (const completion of completions) {
    const minutes = declaredMinutes(completion.templateId);
    if (minutes === null) continue;
    const key = `${completion.day}:${completion.templateId}`;
    const start = selectedAt.get(key);
    if (start === undefined) continue;
    shortfallChecked++;
    const elapsed = completion.at - start;
    if (elapsed < minutes * 60_000 * DURATION_SHORTFALL) shortfallCount++;
  }

  /* 3. implausible hours -------------------------------------------------- */
  const offsetMinutes = raw.timezoneOffsetMinutes ?? new Date().getTimezoneOffset();
  let oddHourCount = 0;
  let schoolCount = 0;
  for (const completion of completions) {
    if (!isSchoolGoal(completion.templateId)) continue;
    schoolCount++;
    const hour = localHour(completion.at, offsetMinutes);
    if (hour >= SCHOOL_UNLIKELY_HOUR_START || hour < SCHOOL_UNLIKELY_HOUR_END) {
      oddHourCount++;
    }
  }

  /* 4. perfect days ------------------------------------------------------- */
  const byDay = new Map<number, GoalCompletion[]>();
  for (const completion of completions) {
    const list = byDay.get(completion.day) ?? [];
    list.push(completion);
    byDay.set(completion.day, list);
  }
  let perfectDays = 0;
  let tightestDay: ParticipantReport["tightestDay"] = null;
  for (const [day, list] of byDay) {
    if (list.length >= 3) perfectDays++;
    // A single completion spans zero milliseconds, which is not evidence of
    // anything, so only days with more than one completion can be judged.
    if (list.length < 2) continue;
    const spanMs =
      Math.max(...list.map((c) => c.at)) - Math.min(...list.map((c) => c.at));
    const declared = list.reduce(
      (sum, c) => sum + (declaredMinutes(c.templateId) ?? 0),
      0,
    );
    if (!tightestDay || spanMs < tightestDay.spanMs) {
      tightestDay = { day, spanMs, declaredMinutes: declared };
    }
  }

  /* 5. reward stages ------------------------------------------------------ */
  const stagesSeen = events
    .filter((e) => e.name === "reward_viewed")
    .map((e) => Number(e.props?.stages_seen ?? 0))
    .filter((n) => n > 0);

  const daysActive = new Set(
    events.filter((e) => e.name === "session_started").map((e) => e.day),
  ).size;

  return {
    participantId: raw.participantId,
    ageBand,
    daysActive,
    completions: completions.length,
    burstPairs,
    totalPairs,
    shortfallCount,
    shortfallChecked,
    oddHourCount,
    schoolCount,
    perfectDays,
    daysWithSelection: byDay.size,
    tightestDay,
    stagesSeen,
  };
}

/* ------------------------------------------------------------------ output */

function pct(numerator: number, denominator: number): string {
  if (denominator === 0) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

/** One meaning everywhere: ⚠️ means "this looks like tapping, not doing". */
function flag(suspicious: boolean): string {
  return suspicious ? "⚠️" : "✅";
}

function formatSpan(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 90) return `${seconds} 秒`;
  return `${Math.round(seconds / 60)} 分钟`;
}

export function reportSelectionRate(report: ParticipantReport): number {
  return report.daysWithSelection === 0
    ? 0
    : report.perfectDays / report.daysWithSelection;
}

export function renderParticipant(report: ParticipantReport): string {
  const burstRate = report.totalPairs === 0 ? 0 : report.burstPairs / report.totalPairs;
  const shortfallRate =
    report.shortfallChecked === 0 ? 0 : report.shortfallCount / report.shortfallChecked;
  const oddHourRate =
    report.schoolCount === 0 ? 0 : report.oddHourCount / report.schoolCount;
  const selectionRate = reportSelectionRate(report);

  const averageStages =
    report.stagesSeen.length === 0
      ? null
      : report.stagesSeen.reduce((a, b) => a + b, 0) / report.stagesSeen.length;

  const tight = report.tightestDay;
  const tightSuspicious =
    tight !== null &&
    tight.declaredMinutes > 0 &&
    tight.spanMs < tight.declaredMinutes * 60_000 * 0.5;

  const rows = [
    `| 连点率 | ${report.burstPairs}/${report.totalPairs} (${pct(report.burstPairs, report.totalPairs)}) | ${flag(burstRate > 0.2)} 相邻完成 < 15 秒即为连点 |`,
    `| 时长不足 | ${report.shortfallCount}/${report.shortfallChecked} (${pct(report.shortfallCount, report.shortfallChecked)}) | ${flag(shortfallRate > 0.2)} 选择→完成 < 声明时长一半 |`,
    `| 时段异常 | ${report.oddHourCount}/${report.schoolCount} (${pct(report.oddHourCount, report.schoolCount)}) | ${flag(oddHourRate > 0.2)} 学校目标在 20:00 后完成 |`,
    // 100% alone can be genuine; it only corroborates when paired with bursts.
    `| 零波动 | ${report.perfectDays}/${report.daysWithSelection} 天全完成 (${pct(report.perfectDays, report.daysWithSelection)}) | ${flag(selectionRate >= 1 && burstRate > 0.2)} 100% 且伴随连点才可疑 |`,
  ];

  if (tight) {
    rows.push(
      `| 最短单日跨度 | Day ${tight.day}：${formatSpan(tight.spanMs)}（当日声明 ${tight.declaredMinutes} 分钟） | ${flag(tightSuspicious)} 跨度 < 声明总时长一半 |`,
    );
  }

  // The remark has to match the flag: a ✅ followed by "动画基本被跳过" reads as a
  // contradiction, and this table gets pasted into the report verbatim.
  const watchedTooLittle = averageStages !== null && averageStages < STAGES_SEEN_FLOOR;
  rows.push(
    `| reward 观看 | 平均 ${averageStages === null ? "—" : averageStages.toFixed(1)}/4 段（${report.stagesSeen.length} 次） | ${
      averageStages === null
        ? "没有 reward_viewed，无法判读"
        : `${flag(watchedTooLittle)} ${
            watchedTooLittle
              ? `< ${STAGES_SEEN_FLOOR} 说明动画基本被跳过`
              : `≥ ${STAGES_SEEN_FLOOR} —— 行为→世界变化这一段被看到了`
          }`
    } |`,
  );

  return [
    `**participant \`${report.participantId.slice(0, 8)}…\`** — ${
      report.ageBand === null
        ? "**年龄未记录**"
        : `年龄组 ${report.ageBand}（${AGE_BAND_LABELS[report.ageBand] ?? "?"}）`
    } · 活跃 ${report.daysActive} 天，完成 ${report.completions} 个目标`,
    "",
    "| 信号 | 值 | 判读 |",
    "| --- | --- | --- |",
    ...rows,
  ].join("\n");
}

/* ---------------------------------------------------------------- cohorts */

export interface AgeCohort {
  /** `null` = every participant whose export does not carry a recorded band. */
  ageBand: string | null;
  label: string;
  participants: number;
  rewardViews: number;
  /** Null when nobody in the cohort has a `reward_viewed` event. */
  averageStagesSeen: number | null;
}

/** Group participants by age band, largest sample first within each group. */
export function cohortByAge(reports: readonly ParticipantReport[]): AgeCohort[] {
  const cohorts = new Map<string | null, AgeCohort>();
  const order: Array<string | null> = [...AGE_BANDS, null];

  for (const report of reports) {
    const band = report.ageBand;
    let cohort = cohorts.get(band);
    if (!cohort) {
      cohort = {
        ageBand: band,
        label: band === null ? "未记录" : (AGE_BAND_LABELS[band] ?? band),
        participants: 0,
        rewardViews: 0,
        averageStagesSeen: null,
      };
      cohorts.set(band, cohort);
    }
    cohort.participants += 1;
    cohort.rewardViews += report.stagesSeen.length;
  }

  for (const cohort of cohorts.values()) {
    const views = reports
      .filter((r) => r.ageBand === cohort.ageBand)
      .flatMap((r) => r.stagesSeen);
    cohort.averageStagesSeen =
      views.length === 0 ? null : views.reduce((a, b) => a + b, 0) / views.length;
  }

  return order
    .filter((band) => cohorts.has(band))
    .map((band) => cohorts.get(band) as AgeCohort);
}

/**
 * The age-band section.
 *
 * Why this is its own table rather than one more row in the summary: pooling
 * ages hides exactly the effect the 6–12 expansion is looking for. A 6-year-old
 * who never reads the reward text and a 12-year-old who watches all four stages
 * average out to a comfortable 2.5, and the pooled number would declare the
 * behaviour → world change beat "seen" when for half the range it never was.
 * That is Simpson's paradox, and the fix is the same as everywhere else in this
 * script: report the segments, and say how many participants are unsegmented.
 */
export function renderAgeCohorts(cohorts: readonly AgeCohort[]): string {
  const lines: string[] = ["## 按年龄分档\n"];
  const total = cohorts.reduce((n, c) => n + c.participants, 0);
  const unsegmented = cohorts.find((c) => c.ageBand === null)?.participants ?? 0;

  lines.push("| 年龄组 | 参与者 | reward 观看次数 | 平均段数 | 判读 |");
  lines.push("| --- | --- | --- | --- | --- |");

  for (const cohort of cohorts) {
    let verdict: string;
    if (cohort.participants < MIN_COHORT_SIZE) {
      verdict = `样本不足（${cohort.participants} 人），不能判读`;
    } else if (cohort.averageStagesSeen === null) {
      verdict = "无 reward_viewed，无法判读";
    } else if (cohort.ageBand === null) {
      verdict = "这只是未分档者的均值，不能当作任何一个年龄组";
    } else {
      verdict =
        cohort.averageStagesSeen < STAGES_SEEN_FLOOR
          ? `${flag(true)} 低于 ${STAGES_SEEN_FLOOR} —— 这个年龄段的动画基本被跳过`
          : `${flag(false)} ≥ ${STAGES_SEEN_FLOOR} —— 行为→世界变化这一段被看到了`;
    }
    lines.push(
      `| ${cohort.label} | ${cohort.participants} | ${cohort.rewardViews} | ${
        cohort.averageStagesSeen === null ? "—" : cohort.averageStagesSeen.toFixed(1)
      }/4 | ${verdict} |`,
    );
  }

  if (total === 0) {
    lines.push("| — | 0 | 0 | — | 没有参与者 |");
  }

  if (unsegmented > 0) {
    lines.push("");
    lines.push(
      `> ⚠️ ${unsegmented}/${total} 位参与者**没有年龄记录**，无法归入任何年龄组。` +
        `这部分数据只能整体看，不能用来回答「低龄段是否成立」。` +
        `补齐方法见 README「年龄分档」：在设备交接前用 \`?debug=1\` 面板录入。`,
    );
  }

  return lines.join("\n");
}

export interface CohortTotals {
  burstPairs: number;
  totalPairs: number;
  shortfallCount: number;
  shortfallChecked: number;
  oddHourCount: number;
  schoolCount: number;
  stagesSeen: number[];
}

/**
 * The across-everyone table.
 *
 * Its `reward 观看` row deliberately carries no ✅/⚠️: with mixed ages that
 * number is an average of different behaviours, not a finding. The verdict
 * belongs to `renderAgeCohorts`, where it is per band.
 */
export function renderSummary(totals: CohortTotals, participantCount: number): string {
  const avgStages =
    totals.stagesSeen.length === 0
      ? null
      : totals.stagesSeen.reduce((a, b) => a + b, 0) / totals.stagesSeen.length;

  return [
    `## 汇总（${participantCount} 人）`,
    "",
    "| 信号 | 值 | 判读 |",
    "| --- | --- | --- |",
    `| 连点率 | ${totals.burstPairs}/${totals.totalPairs} (${pct(totals.burstPairs, totals.totalPairs)}) | ${flag(totals.totalPairs > 0 && totals.burstPairs / totals.totalPairs > 0.2)} |`,
    `| 时长不足 | ${totals.shortfallCount}/${totals.shortfallChecked} (${pct(totals.shortfallCount, totals.shortfallChecked)}) | ${flag(totals.shortfallChecked > 0 && totals.shortfallCount / totals.shortfallChecked > 0.2)} |`,
    `| 时段异常 | ${totals.oddHourCount}/${totals.schoolCount} (${pct(totals.oddHourCount, totals.schoolCount)}) | ${flag(totals.schoolCount > 0 && totals.oddHourCount / totals.schoolCount > 0.2)} |`,
    `| reward 观看 | 平均 ${avgStages === null ? "—" : avgStages.toFixed(1)}/4 段 | **这是混龄均值，不是结论** —— 逐档判读见上面的「按年龄分档」 |`,
  ].join("\n");
}

function main(): void {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("usage: node scripts/analyze-export.ts <export.json> [more.json ...]");
    process.exit(1);
  }

  const reports = files.map((file) => {
    const raw = JSON.parse(readFileSync(file, "utf8")) as RawExport;
    if (raw.schemaVersion !== 1) {
      console.error(`${file}: unexpected schemaVersion ${raw.schemaVersion}`);
      process.exit(1);
    }
    return analyse(raw);
  });

  const totals = reports.reduce(
    (acc, r) => ({
      burstPairs: acc.burstPairs + r.burstPairs,
      totalPairs: acc.totalPairs + r.totalPairs,
      shortfallCount: acc.shortfallCount + r.shortfallCount,
      shortfallChecked: acc.shortfallChecked + r.shortfallChecked,
      oddHourCount: acc.oddHourCount + r.oddHourCount,
      schoolCount: acc.schoolCount + r.schoolCount,
      stagesSeen: [...acc.stagesSeen, ...r.stagesSeen],
    }),
    {
      burstPairs: 0,
      totalPairs: 0,
      shortfallCount: 0,
      shortfallChecked: 0,
      oddHourCount: 0,
      schoolCount: 0,
      stagesSeen: [] as number[],
    },
  );

  console.log(`# Phase 0 数据可信度报告\n`);
  console.log(`样本：${reports.length} 位参与者\n`);

  for (const report of reports) {
    console.log(renderParticipant(report));
    console.log("");
  }

  const cohorts = cohortByAge(reports);
  console.log(renderAgeCohorts(cohorts));
  console.log("");
  if (cohorts.some((c) => c.ageBand === null)) {
    console.log(
      "> 本报告里**未分档**的参与者不能用于任何分龄结论；汇总表的所有数字都包含他们。\n",
    );
  }

  if (reports.length > 1) {
    console.log(renderSummary(totals, reports.length));
    console.log("");
  }

  console.log("## 判读规则\n");
  console.log("- 任一信号 ⚠️ → **学校类目标的完成数据不能用来证明真实行为改变**");
  console.log("- 但 **SAAR 和 D1–D7 留存仍然有效** —— 它们不依赖自评");
  console.log("- 报告里必须区分：哪些结论靠行为数据，哪些靠留存数据");
  console.log("- 连点率高的孩子很可能早已发现可以乱点，其流失属于自我淘汰，");
  console.log("  应从留存分析里单独标注，而不是计入「世界设计不够吸引人」");
  console.log("- **年龄分档的均值不能相加**：某一档跳过动画，和另一档看完，");
  console.log("  混在一起会得到一个「看起来正常」的数字。逐档判读，样本不足的档不判读。");
  console.log("- 未分档的参与者只能整体看，**不能**用来支持任何分龄结论。");
}

// Only run when invoked directly, so tests can import the analysis.
const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) main();
