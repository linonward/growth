import { countEvents, countInitiative, eventDays } from "@/analytics/events";
import { ENERGY_PER_GOAL, TOTAL_DAYS } from "@/domain/constants";
import type {
  AnalyticsEvent,
  DailyCheckIn,
  DailyGoal,
  InitiativeAnswer,
  UserProfile,
} from "@/domain/types";

export interface DayReport {
  day: number;
  selected: number;
  completed: number;
  energy: number;
  initiative: InitiativeAnswer | null;
  openedAt: string | null;
  /** Distinct templates completed that day, for per-category analysis. */
  categories: string[];
}

export interface ExperimentSummary {
  /** Days on which the prototype was opened at least once. */
  daysActive: number;
  appOpenedCount: number;
  goalsSelected: number;
  goalsCompleted: number;
  totalEnergy: number;
  initiativeSelf: number;
  initiativePrompted: number;
  /**
   * Asked and explicitly declined.
   *
   * Reported because SAAR must not be computed over answers only: the children
   * who skip the question are the ones most likely to have been prompted, so
   * dropping them biases the North Star upwards.
   */
  initiativeUnanswered: number;
  /** True for each of the 7 days the student came back to. */
  dayRetention: Record<string, boolean>;
  continueIntent: boolean;
  day7Completed: boolean;
  /**
   * `self / (self + prompted + unanswered)` — see `initiativeUnanswered`.
   * Null when the question never came up at all.
   */
  selfInitiatedRate: number | null;
  rewardViewedCount: number;
}

/**
 * What happened after the 7-day story ended.
 *
 * This is the only signal that tests the actual bet. D1–D7 retention during a
 * 7-day serial measures whether the story held — the answer is largely "of
 * course it did". The question Phase 0 exists to answer is whether a child
 * comes back **after there is nothing new to unlock**, which is why D8 is the
 * primary acceptance point (see the research evaluation §6.1).
 *
 * Derived from `session_started` timestamps relative to `profile.startedAt`,
 * because `experiment_day` is clamped to 1–7 by design: there is no Day 8 in the
 * game, so the app cannot label it and must not pretend to. Nothing new is
 * collected — the events were always there, the analysis just stopped looking
 * at day 7.
 */
export interface PostWeekReport {
  /** Distinct days at offset >= 8 on which the app was opened. */
  daysActive: number;
  /** The offset of the first such day, e.g. 8 for the day right after the story. */
  firstDayActive: number | null;
  /** The furthest offset seen. Useful for "did they ever come back at all". */
  lastDayActive: number | null;
  /** Offset -> opened. Sparse: only days that happened. */
  byDay: Record<string, number>;
}

export interface ExperimentExport {
  schemaVersion: 1;
  exportedAt: string;
  /** Anonymous participant UUID — the same id PostHog receives. Never a real identity. */
  participantId: string;
  /**
   * The device's UTC offset in minutes at export time (`getTimezoneOffset()`,
   * so UTC+8 is -480).
   *
   * The credibility signals care about local time of day — a school goal
   * completed at 21:00 is suspicious in the child's timezone, not the
   * analyst's. Without this the reading silently changes depending on where
   * the analysis runs. Optional so older exports still load.
   */
  timezoneOffsetMinutes?: number;
  profile: UserProfile;
  summary: ExperimentSummary;
  days: DayReport[];
  postWeek: PostWeekReport;
  events: AnalyticsEvent[];
}

export interface ExportInput {
  participantId: string;
  profile: UserProfile;
  goalsByDay: Record<number, DailyGoal[]>;
  checkIns: DailyCheckIn[];
  events: AnalyticsEvent[];
  day7Completed: boolean;
  totalEnergy: number;
  currentDay: number;
}

function templatesFor(goals: readonly DailyGoal[]): string[] {
  return goals.map((g) => g.templateId);
}

/** How many whole 24-hour periods after `from` an instant sits. */
function dayOffset(at: string, from: string): number | null {
  const t = new Date(at).getTime();
  const start = new Date(from).getTime();
  if (Number.isNaN(t) || Number.isNaN(start)) return null;
  return Math.floor((t - start) / 86_400_000) + 1;
}

/**
 * Openings that happened after the 7-day window.
 *
 * Offsets are whole 24-hour periods from `profile.startedAt`, which is the same
 * arithmetic `calendarDayFromStart` uses for the in-game day — so "offset 8" means
 * the same thing here as "Day 8" would if the game had one.
 */
export function buildPostWeekReport(
  events: readonly AnalyticsEvent[],
  startedAt: string,
): PostWeekReport {
  const byDay: Record<string, number> = {};
  for (const event of events) {
    if (event.name !== "session_started") continue;
    const offset = dayOffset(event.at, startedAt);
    if (offset === null || offset <= TOTAL_DAYS) continue;
    byDay[String(offset)] = (byDay[String(offset)] ?? 0) + 1;
  }
  const days = Object.keys(byDay)
    .map(Number)
    .sort((a, b) => a - b);
  return {
    daysActive: days.length,
    firstDayActive: days[0] ?? null,
    lastDayActive: days[days.length - 1] ?? null,
    byDay,
  };
}

/**
 * Build the single JSON artifact the experiment is judged on.
 *
 * Spec AC5: opened count, completed task count, self/prompted, day retention and
 * continue intent must all be recoverable from this payload.
 */
export function buildExportPayload(input: ExportInput): ExperimentExport {
  const {
    participantId,
    profile,
    goalsByDay,
    checkIns,
    events,
    day7Completed,
    totalEnergy,
  } = input;

  const days: DayReport[] = [];
  for (let day = 1; day <= TOTAL_DAYS; day += 1) {
    const goals = goalsByDay[day] ?? [];
    const completed = goals.filter((g) => g.completed);
    const checkIn = checkIns.find((c) => c.day === day);
    days.push({
      day,
      selected: goals.length,
      completed: completed.length,
      energy: completed.length * ENERGY_PER_GOAL,
      initiative: checkIn?.initiative ?? null,
      openedAt: checkIn?.openedAt ?? null,
      categories: templatesFor(completed),
    });
  }

  const openedDays = eventDays(events, "session_started");
  const initiativeSelf = countInitiative(events, "self");
  const initiativePrompted = countInitiative(events, "prompted");
  const initiativeUnanswered = countInitiative(events, "unanswered");
  // The denominator includes the children who declined to answer. Excluding them
  // would compute SAAR over the least likely to have been prompted.
  const asked = initiativeSelf + initiativePrompted + initiativeUnanswered;

  const dayRetention: Record<string, boolean> = {};
  for (let day = 1; day <= TOTAL_DAYS; day += 1) {
    dayRetention[String(day)] =
      openedDays.includes(day) || (goalsByDay[day]?.length ?? 0) > 0;
  }

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    timezoneOffsetMinutes: new Date().getTimezoneOffset(),
    participantId,
    profile,
    summary: {
      daysActive: openedDays.length,
      appOpenedCount: countEvents(events, "session_started"),
      goalsSelected: Object.values(goalsByDay).reduce((n, g) => n + g.length, 0),
      goalsCompleted: Object.values(goalsByDay).reduce(
        (n, g) => n + g.filter((x) => x.completed).length,
        0,
      ),
      totalEnergy,
      initiativeSelf,
      initiativePrompted,
      initiativeUnanswered,
      dayRetention,
      continueIntent: countEvents(events, "continue_requested") > 0,
      day7Completed,
      selfInitiatedRate: asked === 0 ? null : initiativeSelf / asked,
      rewardViewedCount: countEvents(events, "reward_viewed"),
    },
    days,
    postWeek: buildPostWeekReport(events, profile.startedAt),
    events,
  };
}
