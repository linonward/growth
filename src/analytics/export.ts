import { countEvents, countInitiative, eventDays } from "@/analytics/events";
import { ENERGY_PER_GOAL, TOTAL_DAYS } from "@/domain/constants";
import type {
  AnalyticsEvent,
  DailyCheckIn,
  DailyGoal,
  UserProfile,
} from "@/domain/types";

export interface DayReport {
  day: number;
  selected: number;
  completed: number;
  energy: number;
  initiative: "self" | "prompted" | null;
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
  /** True for each of the 7 days the student came back to. */
  dayRetention: Record<string, boolean>;
  continueIntent: boolean;
  day7Completed: boolean;
  /** Self-initiated action rate across the whole experiment. */
  selfInitiatedRate: number | null;
  rewardViewedCount: number;
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
  const answered = initiativeSelf + initiativePrompted;

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
      dayRetention,
      continueIntent: countEvents(events, "continue_requested") > 0,
      day7Completed,
      selfInitiatedRate: answered === 0 ? null : initiativeSelf / answered,
      rewardViewedCount: countEvents(events, "reward_viewed"),
    },
    days,
    events,
  };
}
