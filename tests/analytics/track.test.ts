import { beforeEach, describe, expect, it } from "vitest";

import { __setAnalyticsClient } from "@/analytics/client";
import { EXPERIMENT_VERSION } from "@/analytics/properties";
import {
  trackContinueRequested,
  trackDay7Completed,
  trackDayCompleted,
  trackExperimentStarted,
  trackGoalCompleted,
  trackGoalSelected,
  trackInitiativeAnswered,
  trackMilestoneViewed,
  trackPetViewed,
  trackPlantViewed,
  trackRewardViewed,
  trackSessionStarted,
  trackWorldViewed,
} from "@/analytics/track";
import type { AnalyticsEventName } from "@/domain/types";
import { ANALYTICS_EVENT_NAMES } from "@/domain/types";

/**
 * A fake PostHog client, so these tests assert the wire format without any
 * network or real project.
 */
const captured: Array<{ name: string; props: Record<string, unknown> }> = [];

beforeEach(() => {
  captured.length = 0;
  __setAnalyticsClient({
    capture: (name: string, props: Record<string, unknown>) => {
      captured.push({ name, props });
    },
  } as never);
});

const last = () => captured[captured.length - 1];

describe("AC ④ unified event schema", () => {
  it("emits only names from the declared schema", () => {
    trackExperimentStarted({ day: 1, petSpecies: "fox", worldNameSet: true });
    trackSessionStarted({ day: 1 });
    trackWorldViewed({ day: 1 });
    trackGoalSelected({ day: 1, goalType: "reading" });
    trackGoalCompleted({
      day: 1,
      goalType: "reading",
      energyEarned: 10,
      petState: "egg",
      plantState: "seed",
      totalEnergy: 10,
    });
    trackRewardViewed({
      day: 1,
      goalType: "reading",
      isMajor: false,
      target: "pet",
      stagesSeen: 4,
    });
    trackPetViewed({ day: 1, petState: "egg" });
    trackPlantViewed({ day: 1, plantState: "seed" });
    trackInitiativeAnswered({ day: 1, initiative: "self" });
    trackMilestoneViewed({ day: 1, milestoneId: "x" });
    trackDayCompleted({ day: 1, goalsCompleted: 3, energyEarned: 30 });
    trackDay7Completed({ day: 7, totalEnergy: 210 });
    trackContinueRequested({ day: 7, totalEnergy: 210 });

    const allowed = new Set<string>(ANALYTICS_EVENT_NAMES);
    for (const { name } of captured) expect(allowed.has(name)).toBe(true);
  });

  it("covers the required event set", () => {
    expect([...ANALYTICS_EVENT_NAMES].sort()).toEqual(
      [
        "continue_requested",
        "day7_completed",
        "day_completed",
        "experiment_started",
        "goal_completed",
        "goal_selected",
        "history_viewed",
        "initiative_answered",
        "milestone_viewed",
        "pet_viewed",
        "plant_viewed",
        "reward_viewed",
        "session_started",
        "world_viewed",
      ].sort(),
    );
  });
});

describe("AC ⑤ every event carries the common properties", () => {
  it("adds experiment_version and experiment_day to all events", () => {
    const emitAll: Array<() => void> = [
      () => trackExperimentStarted({ day: 3, petSpecies: "fox", worldNameSet: true }),
      () => trackSessionStarted({ day: 3 }),
      () => trackWorldViewed({ day: 3 }),
      () => trackGoalSelected({ day: 3, goalType: "study" }),
      () =>
        trackGoalCompleted({
          day: 3,
          goalType: "study",
          energyEarned: 10,
          petState: "baby",
          plantState: "leaf",
          totalEnergy: 70,
        }),
      () =>
        trackRewardViewed({
          day: 3,
          goalType: "study",
          isMajor: true,
          target: "pet",
          stagesSeen: 2,
        }),
      () => trackPetViewed({ day: 3, petState: "baby" }),
      () => trackPlantViewed({ day: 3, plantState: "leaf" }),
      () => trackInitiativeAnswered({ day: 3, initiative: "prompted" }),
      () => trackMilestoneViewed({ day: 3, milestoneId: "m" }),
      () => trackDayCompleted({ day: 3, goalsCompleted: 2, energyEarned: 20 }),
      () => trackDay7Completed({ day: 7, totalEnergy: 200 }),
      () => trackContinueRequested({ day: 7, totalEnergy: 200 }),
    ];

    for (const emit of emitAll) emit();

    expect(captured).toHaveLength(emitAll.length);
    for (const event of captured) {
      expect(event.props.experiment_version).toBe(EXPERIMENT_VERSION);
      expect(event.props.experiment_day).toBeGreaterThanOrEqual(1);
      expect(event.props.experiment_day).toBeLessThanOrEqual(7);
    }
  });
});

describe("AC ⑥ goal_type is a property, not an event name", () => {
  it("records goal_type on goal_completed", () => {
    trackGoalCompleted({
      day: 3,
      goalType: "reading",
      energyEarned: 10,
      petState: "baby",
      plantState: "young_plant",
      totalEnergy: 90,
    });
    expect(last().name).toBe("goal_completed");
    expect(last().props).toMatchObject({
      goal_type: "reading",
      experiment_day: 3,
      experiment_version: EXPERIMENT_VERSION,
      energy_earned: 10,
      pet_state: "baby",
      plant_state: "young_plant",
    });
  });

  it("uses one event for every goal type", () => {
    for (const goalType of ["reading", "study", "exercise", "interest", "helping"]) {
      trackGoalSelected({ day: 2, goalType });
    }
    expect(captured.every((e) => e.name === "goal_selected")).toBe(true);
    expect(captured.map((e) => e.props.goal_type)).toEqual([
      "reading",
      "study",
      "exercise",
      "interest",
      "helping",
    ]);
  });
});

describe("AC ⑦ initiative is one event with a breakdown property", () => {
  it("records self and prompted on initiative_answered", () => {
    trackInitiativeAnswered({ day: 4, initiative: "self" });
    expect(last().name).toBe("initiative_answered");
    expect(last().props.initiative).toBe("self");

    trackInitiativeAnswered({ day: 4, initiative: "prompted" });
    expect(last().name).toBe("initiative_answered");
    expect(last().props.initiative).toBe("prompted");

    // The breakdown is one query: filter on initiative.
    const answers = captured.map((e) => e.props.initiative);
    expect(answers).toEqual(["self", "prompted"]);
  });
});

describe("reward_viewed records how much was actually watched", () => {
  it("carries stages_seen so skipping is measurable", () => {
    trackRewardViewed({
      day: 2,
      goalType: "math",
      isMajor: false,
      target: "plant",
      stagesSeen: 1,
    });
    expect(last().name).toBe("reward_viewed");
    expect(last().props.stages_seen).toBe(1);
  });
});

describe("AC ⑧⑨ end-of-week signal events", () => {
  it("records day7_completed with the final energy", () => {
    trackDay7Completed({ day: 7, totalEnergy: 210 });
    expect(last().name).toBe("day7_completed");
    expect(last().props).toMatchObject({ experiment_day: 7, total_energy: 210 });
  });

  it("records continue_requested so the Day 7 funnel can be built", () => {
    trackContinueRequested({ day: 7, totalEnergy: 210 });
    expect(last().name).toBe("continue_requested");
    expect(last().props).toMatchObject({ experiment_day: 7, total_energy: 210 });
  });
});

describe("analytics never breaks the app", () => {
  it("no-ops when no client is configured", () => {
    __setAnalyticsClient(null);
    expect(() => trackWorldViewed({ day: 1 })).not.toThrow();
  });

  it("swallows errors thrown by the client", () => {
    __setAnalyticsClient({
      capture: () => {
        throw new Error("network down");
      },
    } as never);
    expect(() => trackGoalSelected({ day: 1, goalType: "reading" })).not.toThrow();
  });
});

describe("schema typing", () => {
  it("the event name union has no duplicates or strays", () => {
    const names = ANALYTICS_EVENT_NAMES as readonly AnalyticsEventName[];
    expect(new Set(names).size).toBe(names.length);
    expect(names).toHaveLength(14);
  });
});
