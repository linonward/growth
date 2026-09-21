import { beforeEach, describe, expect, it } from "vitest";

import { clearEvents, flushEvents, readEvents } from "@/analytics/persistence";
import { getActiveAgeBand, setActiveAgeBand } from "@/analytics/properties";
import { ANALYTICS_KEY, STORAGE_KEY } from "@/domain/constants";
import {
  adoptAgeBand,
  adoptPersistedEvents,
  selectActiveDays,
  selectGrowth,
  selectTotalEnergy,
  usePrototypeStore,
} from "@/store/prototype-store";

const START = "2024-05-01T09:00:00.000Z";

function resetStore() {
  localStorage.clear();
  clearEvents();
  usePrototypeStore.setState({
    hasCompletedFirstRun: true,
    profile: {
      worldName: "我的成长岛",
      petName: "小光",
      petSpecies: "fox",
      startedAt: START,
      ageBand: null,
    },
    currentDay: 1,
    dayOverride: null,
    debugEnergyDelta: 0,
    lastSeenDay: 1,
    goalsByDay: {},
    checkIns: [],
    seenMilestoneIds: [],
    day7Completed: false,
    continueRequested: false,
    events: [],
    hasHydrated: true,
    activeReward: null,
    activeFinale: false,
    pendingDayStart: null,
    pendingInitiativeDay: null,
  });
}

/** Select the first `count` preset goals for a day. */
function pickGoals(day: number, count = 3) {
  const ids = ["math", "chinese", "english", "reading", "exercise"].slice(0, count);
  usePrototypeStore.getState().selectGoals(day, ids);
  return (usePrototypeStore.getState().goalsByDay[day] ?? []).map((g) => g.id);
}

beforeEach(resetStore);

/**
 * The star garden is the world's behaviour-driven axis, and it is only as good
 * as the plumbing from the store to `getWorldState`. Wiring it in the selectors
 * but not in the read paths would leave it invisible with every unit test on
 * `domain/world.ts` still green — which is exactly what happened first time.
 */
describe("star garden plumbing", () => {
  it("starts empty and grows one star per active day", () => {
    expect(selectActiveDays(usePrototypeStore.getState())).toBe(0);
    expect(selectGrowth(usePrototypeStore.getState()).worldState.starsEarned).toBe(0);

    const day1 = pickGoals(1, 1);
    usePrototypeStore.getState().completeGoal(day1[0]);
    usePrototypeStore.getState().debugSetDay(2);
    const day2 = pickGoals(2, 1);
    usePrototypeStore.getState().completeGoal(day2[0]);

    const state = usePrototypeStore.getState();
    expect(selectActiveDays(state)).toBe(2);
    expect(selectGrowth(state).worldState.starsEarned).toBe(2);
  });

  it("does not grow again for a second goal on the same day", () => {
    const ids = pickGoals(1, 2);
    usePrototypeStore.getState().completeGoal(ids[0]);
    expect(selectGrowth(usePrototypeStore.getState()).worldState.starsEarned).toBe(1);
    usePrototypeStore.getState().completeGoal(ids[1]);
    expect(selectGrowth(usePrototypeStore.getState()).worldState.starsEarned).toBe(1);
  });

  it("clears with a prototype reset", () => {
    const ids = pickGoals(1, 1);
    usePrototypeStore.getState().completeGoal(ids[0]);
    expect(selectGrowth(usePrototypeStore.getState()).worldState.starsEarned).toBe(1);

    usePrototypeStore.getState().resetPrototype();
    expect(selectActiveDays(usePrototypeStore.getState())).toBe(0);
    expect(selectGrowth(usePrototypeStore.getState()).worldState.starsEarned).toBe(0);
  });
});

describe("goal completion", () => {
  it("awards exactly +10 energy for one completed goal", () => {
    const [first] = pickGoals(1);
    expect(selectTotalEnergy(usePrototypeStore.getState())).toBe(0);

    usePrototypeStore.getState().completeGoal(first);

    expect(selectTotalEnergy(usePrototypeStore.getState())).toBe(10);
    expect(usePrototypeStore.getState().events.at(-1)?.name).toBe("goal_completed");
  });

  it("caps a single day at 30 energy", () => {
    const ids = pickGoals(1, 3);
    for (const id of ids) usePrototypeStore.getState().completeGoal(id);

    const state = usePrototypeStore.getState();
    expect(selectTotalEnergy(state)).toBe(30);
    expect(state.goalsByDay[1].filter((g) => g.completed)).toHaveLength(3);
  });

  it("never lets a fourth goal be selected for one day", () => {
    const ids = pickGoals(1, 5);
    expect(ids).toHaveLength(3);
  });

  it("ignores a repeated completion of the same goal", () => {
    const [first] = pickGoals(1);
    usePrototypeStore.getState().completeGoal(first);
    usePrototypeStore.getState().completeGoal(first);
    usePrototypeStore.getState().completeGoal(first);

    expect(selectTotalEnergy(usePrototypeStore.getState())).toBe(10);
    expect(
      usePrototypeStore.getState().events.filter((e) => e.name === "goal_completed"),
    ).toHaveLength(1);
  });

  it("ignores an unknown goal id", () => {
    pickGoals(1);
    usePrototypeStore.getState().completeGoal("d1-nope");
    expect(selectTotalEnergy(usePrototypeStore.getState())).toBe(0);
  });

  it("locks the day's selection once something is completed", () => {
    const [first] = pickGoals(1);
    usePrototypeStore.getState().completeGoal(first);
    usePrototypeStore.getState().selectGoals(1, ["helping"]); // a valid but unselected template

    const goals = usePrototypeStore.getState().goalsByDay[1];
    expect(goals).toHaveLength(3);
    expect(goals.map((g) => g.templateId)).toContain("math");
  });

  it("opens the reward moment with the real world change", () => {
    const [first] = pickGoals(1);
    usePrototypeStore.getState().completeGoal(first);

    const reward = usePrototypeStore.getState().activeReward;
    expect(reward).not.toBeNull();
    expect(reward?.day).toBe(1);
    expect(reward?.totalEnergyAfter).toBe(10);
    expect(reward?.change.target).toBe("pet");
  });

  it("accumulates 30 energy per day across the week", () => {
    for (let day = 1; day <= 7; day += 1) {
      usePrototypeStore.getState().debugSetDay(day);
      for (const id of pickGoals(day)) usePrototypeStore.getState().completeGoal(id);
      usePrototypeStore.getState().dismissReward();
    }
    expect(selectTotalEnergy(usePrototypeStore.getState())).toBe(210);
  });
});

describe("Day Gates through the store", () => {
  it("Day 1 cannot hatch even with maximum energy", () => {
    usePrototypeStore.getState().debugSetDay(1);
    usePrototypeStore.getState().debugAdjustEnergy(210);
    expect(selectGrowth(usePrototypeStore.getState()).petState).toBe("wiggling_egg");
  });

  it("hatches on Day 3", () => {
    usePrototypeStore.getState().debugSetDay(3);
    usePrototypeStore.getState().debugAdjustEnergy(60);
    expect(selectGrowth(usePrototypeStore.getState()).petState).toBe("baby");
  });

  it("reaches young on Day 5 but not evolved", () => {
    usePrototypeStore.getState().debugSetDay(5);
    usePrototypeStore.getState().debugAdjustEnergy(210);
    expect(selectGrowth(usePrototypeStore.getState()).petState).toBe("young");
  });

  it("evolves and blooms only on Day 7, and only after acting that day", () => {
    usePrototypeStore.getState().debugSetDay(7);
    usePrototypeStore.getState().debugAdjustEnergy(180);

    // Arriving with 180 energy is not enough: spec section 11 plays the finale
    // "after completing the final task".
    const beforeAction = selectGrowth(usePrototypeStore.getState());
    expect(beforeAction.petState).toBe("young");
    expect(beforeAction.plantState).toBe("tree");
    expect(beforeAction.worldState.newAreaUnlocked).toBe(false);

    const ids = pickGoals(7, 3);
    usePrototypeStore.getState().completeGoal(ids[0]);

    const afterAction = selectGrowth(usePrototypeStore.getState());
    expect(afterAction.petState).toBe("evolved");
    expect(afterAction.plantState).toBe("bloom");
    expect(afterAction.worldState.newAreaUnlocked).toBe(true);
  });

  it("never evolves or blooms before Day 7", () => {
    for (const day of [1, 2, 3, 4, 5, 6]) {
      usePrototypeStore.getState().resetPrototype();
      usePrototypeStore.getState().debugSetDay(day);
      usePrototypeStore.getState().debugAdjustEnergy(210);
      const ids = pickGoals(day, 3);
      usePrototypeStore.getState().completeGoal(ids[0]);
      const growth = selectGrowth(usePrototypeStore.getState());
      expect(growth.petState).not.toBe("evolved");
      expect(growth.plantState).not.toBe("bloom");
      expect(growth.worldState.newAreaUnlocked).toBe(false);
    }
  });
});

describe("persistence", () => {
  it("keeps progress across a simulated page reload", async () => {
    const ids = pickGoals(1, 3);
    usePrototypeStore.getState().completeGoal(ids[0]);
    usePrototypeStore.getState().completeGoal(ids[1]);
    usePrototypeStore.getState().dismissReward();

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    expect(parsed.state.goalsByDay["1"]).toHaveLength(3);
    expect(
      parsed.state.goalsByDay["1"].filter((g: { completed: boolean }) => g.completed),
    ).toHaveLength(2);
    // Transient fields must never be persisted.
    expect(parsed.state.hasHydrated).toBeUndefined();
    expect(parsed.state.activeReward).toBeUndefined();

    // Simulate a cold start: memory is empty, storage still holds the snapshot.
    resetStore();
    localStorage.setItem(STORAGE_KEY, raw as string);
    await usePrototypeStore.persist.rehydrate();

    const restored = usePrototypeStore.getState();
    expect(selectTotalEnergy(restored)).toBe(20);
    expect(restored.goalsByDay[1].filter((g) => g.completed)).toHaveLength(2);
  });

  it("resetPrototype fully restores Day 1", () => {
    for (let day = 1; day <= 3; day += 1) {
      usePrototypeStore.getState().debugSetDay(day);
      for (const id of pickGoals(day)) usePrototypeStore.getState().completeGoal(id);
      usePrototypeStore.getState().dismissReward();
    }
    expect(selectTotalEnergy(usePrototypeStore.getState())).toBe(90);

    usePrototypeStore.getState().resetPrototype();

    const state = usePrototypeStore.getState();
    expect(state.currentDay).toBe(1);
    expect(state.dayOverride).toBeNull();
    expect(selectTotalEnergy(state)).toBe(0);
    expect(state.goalsByDay).toEqual({});
    expect(state.checkIns).toEqual([]);
    expect(state.day7Completed).toBe(false);
    expect(state.continueRequested).toBe(false);

    const growth = selectGrowth(state);
    expect(growth.petState).toBe("egg");
    expect(growth.plantState).toBe("seed");
    expect(growth.worldState.newAreaUnlocked).toBe(false);
    // Identity survives a progress reset so the tester need not re-onboard.
    expect(state.profile.worldName).toBe("我的成长岛");
  });
});

describe("day rollover", () => {
  it("advances the day from the calendar and flags a welcome", () => {
    usePrototypeStore.setState({ lastSeenDay: 1, currentDay: 1 });
    usePrototypeStore.getState().syncDay(new Date("2024-05-02T08:00:00.000Z"));

    const state = usePrototypeStore.getState();
    expect(state.currentDay).toBe(2);
    expect(state.pendingDayStart).toBe(2);
  });

  it("does not flag a welcome on the same day", () => {
    usePrototypeStore.setState({ lastSeenDay: 1, currentDay: 1 });
    usePrototypeStore.getState().syncDay(new Date("2024-05-01T22:00:00.000Z"));
    expect(usePrototypeStore.getState().pendingDayStart).toBeNull();
  });

  it("never rolls past Day 7", () => {
    usePrototypeStore.setState({ lastSeenDay: 7, currentDay: 7 });
    usePrototypeStore.getState().syncDay(new Date("2024-05-30T08:00:00.000Z"));
    expect(usePrototypeStore.getState().currentDay).toBe(7);
  });
});

describe("initiative capture", () => {
  it("asks only after the day's first completion", () => {
    const ids = pickGoals(1, 3);
    usePrototypeStore.getState().completeGoal(ids[0]);
    expect(usePrototypeStore.getState().pendingInitiativeDay).toBe(1);

    usePrototypeStore.getState().dismissReward();
    usePrototypeStore.getState().completeGoal(ids[1]);
    // Already answered? No — but the question is only asked once per day.
    expect(usePrototypeStore.getState().pendingInitiativeDay).toBe(1);

    usePrototypeStore.getState().answerInitiative(1, "self");
    usePrototypeStore.getState().dismissReward();
    usePrototypeStore.getState().completeGoal(ids[2]);
    expect(usePrototypeStore.getState().pendingInitiativeDay).toBeNull();
  });

  it("records self vs prompted and stops asking for that day", () => {
    const ids = pickGoals(1, 3);
    usePrototypeStore.getState().completeGoal(ids[0]);
    usePrototypeStore.getState().answerInitiative(1, "prompted");

    const state = usePrototypeStore.getState();
    expect(state.checkIns.find((c) => c.day === 1)?.initiative).toBe("prompted");
    expect(state.pendingInitiativeDay).toBeNull();
    expect(
      state.events.some(
        (e) => e.name === "initiative_answered" && e.props?.initiative === "prompted",
      ),
    ).toBe(true);
  });

  it("does not re-ask on a later day that already has an answer", () => {
    usePrototypeStore.setState({
      checkIns: [{ day: 2, initiative: "self", openedAt: START }],
    });
    usePrototypeStore.getState().debugSetDay(2);
    for (const id of pickGoals(2, 3)) usePrototypeStore.getState().completeGoal(id);
    expect(usePrototypeStore.getState().pendingInitiativeDay).toBeNull();
  });

  it("treats 先不回答 as an answer that stops the question", () => {
    // Regression: an unanswered question used to stay pending, so it re-appeared
    // on the home screen every time the student navigated there — a nag, and a
    // gap that would let SAAR be computed over answerers only.
    const ids = pickGoals(1, 3);
    usePrototypeStore.getState().completeGoal(ids[0]);
    expect(usePrototypeStore.getState().pendingInitiativeDay).toBe(1);

    usePrototypeStore.getState().answerInitiative(1, "unanswered");

    const state = usePrototypeStore.getState();
    expect(state.pendingInitiativeDay).toBeNull();
    expect(state.checkIns.find((c) => c.day === 1)?.initiative).toBe("unanswered");
    expect(
      state.events.some(
        (e) => e.name === "initiative_answered" && e.props?.initiative === "unanswered",
      ),
    ).toBe(true);

    // And it must not come back for the rest of the day.
    usePrototypeStore.getState().dismissReward();
    usePrototypeStore.getState().completeGoal(ids[1]);
    expect(usePrototypeStore.getState().pendingInitiativeDay).toBeNull();
  });

  it("keeps the declined answer in SAAR's denominator", () => {
    const ids = pickGoals(1, 3);
    usePrototypeStore.getState().completeGoal(ids[0]);
    usePrototypeStore.getState().answerInitiative(1, "unanswered");
    usePrototypeStore.getState().dismissReward();
    usePrototypeStore.getState().answerInitiative(1, "unanswered");

    const summary = usePrototypeStore.getState().buildExport().summary;
    expect(summary.initiativeUnanswered).toBe(1);
    // One declined answer, no self answers: the honest rate is 0, not "no data".
    expect(summary.selfInitiatedRate).toBe(0);
  });
});

describe("analytics export", () => {
  it("summarises the experiment for off-line analysis", () => {
    usePrototypeStore.getState().recordDayOpened(1);
    const ids = pickGoals(1, 3);
    usePrototypeStore.getState().completeGoal(ids[0]);
    usePrototypeStore.getState().answerInitiative(1, "self");
    usePrototypeStore.getState().dismissReward();
    usePrototypeStore.getState().completeGoal(ids[1]);
    usePrototypeStore.getState().dismissReward();
    usePrototypeStore.getState().requestContinue();

    const payload = usePrototypeStore.getState().buildExport();
    expect(payload.schemaVersion).toBe(1);
    expect(payload.summary.goalsSelected).toBe(3);
    expect(payload.summary.goalsCompleted).toBe(2);
    expect(payload.summary.totalEnergy).toBe(20);
    expect(payload.summary.initiativeSelf).toBe(1);
    expect(payload.summary.initiativePrompted).toBe(0);
    expect(payload.summary.selfInitiatedRate).toBe(1);
    expect(payload.summary.continueIntent).toBe(true);
    expect(payload.summary.dayRetention["1"]).toBe(true);
    expect(payload.days).toHaveLength(7);
    expect(payload.days[0]).toMatchObject({
      day: 1,
      selected: 3,
      completed: 2,
      energy: 20,
    });
  });

  it("attributes the export to the anonymous participant", () => {
    const payload = usePrototypeStore.getState().buildExport();
    expect(payload.participantId).toMatch(/^[0-9a-f-]{36}$/i);
    // Never a real identity.
    expect(payload.participantId).not.toContain("@");
  });

  it("reports a null self-initiated rate when nothing was answered", () => {
    expect(
      usePrototypeStore.getState().buildExport().summary.selfInitiatedRate,
    ).toBeNull();
  });
});

describe("debug helpers", () => {
  it("triggerReward always produces a reward moment", () => {
    usePrototypeStore.getState().debugTriggerReward();
    expect(usePrototypeStore.getState().activeReward).not.toBeNull();
    expect(selectTotalEnergy(usePrototypeStore.getState())).toBe(10);
  });

  it("triggerDay7Event lands the finale", () => {
    usePrototypeStore.getState().debugTriggerDay7Event();
    const state = usePrototypeStore.getState();
    expect(state.currentDay).toBe(7);
    expect(selectTotalEnergy(state)).toBe(180);
    expect(state.activeReward?.isFinale).toBe(true);

    state.dismissReward();
    expect(usePrototypeStore.getState().activeFinale).toBe(true);
    usePrototypeStore.getState().dismissFinale();
    expect(usePrototypeStore.getState().day7Completed).toBe(true);
  });

  it("clamps debug energy into the legal range", () => {
    usePrototypeStore.getState().debugAdjustEnergy(9999);
    expect(selectTotalEnergy(usePrototypeStore.getState())).toBe(210);
    usePrototypeStore.getState().debugAdjustEnergy(-9999);
    expect(selectTotalEnergy(usePrototypeStore.getState())).toBe(0);
  });
});

describe("Day 7 finale durability", () => {
  /** Earn the finale, then simulate the app closing before it was watched. */
  function earnFinaleButMissIt() {
    usePrototypeStore.getState().debugSetDay(7);
    usePrototypeStore.getState().debugAdjustEnergy(180);
    const ids = pickGoals(7, 3);
    usePrototypeStore.getState().completeGoal(ids[0]);
    usePrototypeStore.getState().dismissReward();
    // activeFinale is transient UI state, so a reload wipes it.
    usePrototypeStore.setState({ activeFinale: false, day7Completed: false });
  }

  it("re-arms the finale when it was earned but never watched", () => {
    earnFinaleButMissIt();
    expect(selectGrowth(usePrototypeStore.getState()).worldState.newAreaUnlocked).toBe(
      true,
    );
    expect(usePrototypeStore.getState().activeFinale).toBe(false);

    usePrototypeStore.getState().resumeFinaleIfNeeded();
    expect(usePrototypeStore.getState().activeFinale).toBe(true);
  });

  it("does not re-arm it once it has been watched", () => {
    earnFinaleButMissIt();
    usePrototypeStore.setState({ activeFinale: true });
    usePrototypeStore.getState().dismissFinale();
    expect(usePrototypeStore.getState().day7Completed).toBe(true);

    usePrototypeStore.getState().resumeFinaleIfNeeded();
    expect(usePrototypeStore.getState().activeFinale).toBe(false);
  });

  it("never re-arms it before the new area exists", () => {
    usePrototypeStore.getState().debugSetDay(7);
    usePrototypeStore.getState().debugAdjustEnergy(180);
    usePrototypeStore.getState().resumeFinaleIfNeeded();
    expect(usePrototypeStore.getState().activeFinale).toBe(false);
  });
});

describe("analytics storage is split from game state", () => {
  it("writes events to their own key, not the game-state key", () => {
    const ids = pickGoals(1, 3);
    usePrototypeStore.getState().completeGoal(ids[0]);
    flushEvents();

    const main = localStorage.getItem(STORAGE_KEY) ?? "";
    const analytics = localStorage.getItem(ANALYTICS_KEY) ?? "";

    // The whole point: game-state writes must not carry the event log.
    expect(JSON.parse(main).state.events).toBeUndefined();
    expect(JSON.parse(analytics).events.length).toBeGreaterThan(0);
    expect(analytics).toContain("goal_completed");
  });

  it("keeps the game-state payload small regardless of how many events exist", () => {
    const ids = pickGoals(1, 3);
    for (const id of ids) {
      usePrototypeStore.getState().completeGoal(id);
      usePrototypeStore.getState().dismissReward();
    }
    flushEvents();

    const main = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    const analytics = JSON.parse(localStorage.getItem(ANALYTICS_KEY) ?? "{}");

    // 3 x goal_selected + 3 x goal_completed (+ any milestone markers).
    expect(analytics.events.length).toBeGreaterThanOrEqual(6);
    // Game state stays tiny because the log no longer rides along with it.
    expect(JSON.stringify(main.state).length).toBeLessThan(1200);
  });

  it("restores the log from its own key", () => {
    const ids = pickGoals(1, 2);
    usePrototypeStore.getState().completeGoal(ids[0]);
    usePrototypeStore.getState().answerInitiative(1, "self");
    flushEvents();
    const before = readEvents().length;
    expect(before).toBeGreaterThan(0);

    // Cold start: memory empty, storage intact. (resetStore() would wipe
    // storage too, so clear only the in-memory log.)
    usePrototypeStore.setState({ events: [] });
    adoptPersistedEvents();
    expect(usePrototypeStore.getState().events.length).toBe(before);
    expect(
      usePrototypeStore
        .getState()
        .events.some(
          (e) => e.name === "initiative_answered" && e.props?.initiative === "self",
        ),
    ).toBe(true);
  });

  it("keeps the experiment log across a reset", () => {
    const ids = pickGoals(1, 3);
    usePrototypeStore.getState().completeGoal(ids[0]);
    flushEvents();
    const before = readEvents().length;
    expect(before).toBeGreaterThan(0);

    usePrototypeStore.getState().resetPrototype();
    flushEvents();

    // Progress is gone...
    expect(usePrototypeStore.getState().goalsByDay).toEqual({});
    expect(usePrototypeStore.getState().currentDay).toBe(1);
    // ...but collected data survives, and nothing extra is appended (there is
    // no reset event in the Phase 0 schema).
    expect(readEvents().length).toBe(before);
    expect(usePrototypeStore.getState().events.length).toBe(before);
  });

  it("exports the log that was restored from storage", () => {
    const ids = pickGoals(1, 2);
    usePrototypeStore.getState().completeGoal(ids[0]);
    flushEvents();

    const payload = usePrototypeStore.getState().buildExport();
    expect(payload.summary.goalsCompleted).toBe(1);
    expect(payload.events.length).toBeGreaterThan(0);
  });
});

/**
 * The age band is what makes the 6–12 study analysable at all, so these guard
 * the three ways it could silently go missing: not reaching the analytics layer,
 * not surviving a reload, and not surviving a prototype reset.
 */
describe("age band recording", () => {
  it("defaults to unrecorded rather than guessing a band", () => {
    expect(usePrototypeStore.getState().profile.ageBand).toBeNull();
    expect(getActiveAgeBand()).toBeNull();
  });

  it("reaches the analytics layer, not only the profile", () => {
    usePrototypeStore.getState().setAgeBand("6-7");

    expect(usePrototypeStore.getState().profile.ageBand).toBe("6-7");
    // The profile alone would make the export right and every event wrong.
    expect(getActiveAgeBand()).toBe("6-7");

    const ids = pickGoals(1, 1);
    usePrototypeStore.getState().completeGoal(ids[0]);
    expect(usePrototypeStore.getState().events.at(-1)?.props?.age_band).toBe("6-7");
  });

  it("persists the band and puts it in the export", () => {
    usePrototypeStore.getState().setAgeBand("9-10");

    expect(usePrototypeStore.getState().buildExport().profile.ageBand).toBe("9-10");
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(raw.state.profile.ageBand).toBe("9-10");
  });

  it("keeps the band across a prototype reset, like the participant id", () => {
    usePrototypeStore.getState().setAgeBand("11-12");
    usePrototypeStore.getState().resetPrototype();

    expect(usePrototypeStore.getState().profile.ageBand).toBe("11-12");
    // The analytics layer holds its own copy, so a reset that only touched the
    // profile would make every post-reset event unsegmented.
    expect(getActiveAgeBand()).toBe("11-12");
  });

  it("can be cleared, and clearing propagates too", () => {
    usePrototypeStore.getState().setAgeBand("6-7");
    usePrototypeStore.getState().setAgeBand(null);

    expect(usePrototypeStore.getState().profile.ageBand).toBeNull();
    expect(getActiveAgeBand()).toBeNull();
  });

  it("re-publishes the stored band on hydration", () => {
    // Simulate a cold start: a band was recorded on a previous visit, the
    // in-memory analytics copy is blank (as it is in a fresh page load).
    usePrototypeStore.getState().setAgeBand("8-9");
    setActiveAgeBand(null);

    adoptAgeBand();

    expect(getActiveAgeBand()).toBe("8-9");
  });
});

describe("initiative question survives an app close", () => {
  const openedAt = (iso: string) => [
    { day: 1, openedAt: iso, initiative: undefined as undefined },
  ];

  it("restores an unanswered question from earlier the same day", () => {
    // Regression: the pending question was transient, so a child who closed the
    // app straight after their first goal was never asked at all. Those children
    // are the ones least likely to answer "I opened it myself", so the loss was
    // not random — it inflated SAAR.
    usePrototypeStore.setState({
      checkIns: openedAt("2026-09-21T09:00:00.000Z"),
      pendingInitiativeDay: 1,
      currentDay: 1,
    });
    usePrototypeStore
      .getState()
      .resumeInitiativeIfNeeded(new Date("2026-09-21T18:00:00.000Z"));
    expect(usePrototypeStore.getState().pendingInitiativeDay).toBe(1);
  });

  it("does not resurrect yesterday's question", () => {
    // Asking about "today" three days later would manufacture an answer.
    usePrototypeStore.setState({
      checkIns: openedAt("2026-09-18T09:00:00.000Z"),
      pendingInitiativeDay: 1,
      currentDay: 1,
    });
    usePrototypeStore
      .getState()
      .resumeInitiativeIfNeeded(new Date("2026-09-21T09:00:00.000Z"));
    expect(usePrototypeStore.getState().pendingInitiativeDay).toBeNull();
  });

  it("does not re-open a question that was answered or declined", () => {
    for (const answer of ["self", "prompted", "unanswered"] as const) {
      usePrototypeStore.setState({
        checkIns: [{ day: 1, openedAt: START, initiative: answer }],
        pendingInitiativeDay: null,
        currentDay: 1,
      });
      usePrototypeStore.getState().resumeInitiativeIfNeeded(new Date(START));
      expect(usePrototypeStore.getState().pendingInitiativeDay).toBeNull();
    }
  });

  it("keeps the question out of a day that is not the current one", () => {
    usePrototypeStore.setState({
      checkIns: openedAt("2026-09-21T09:00:00.000Z"),
      pendingInitiativeDay: 1,
      currentDay: 2,
    });
    usePrototypeStore
      .getState()
      .resumeInitiativeIfNeeded(new Date("2026-09-21T18:00:00.000Z"));
    expect(usePrototypeStore.getState().pendingInitiativeDay).toBe(1);
  });
});
