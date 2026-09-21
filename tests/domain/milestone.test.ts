import { describe, expect, it } from "vitest";
import type { MilestoneContext } from "@/domain/milestone";
import { getNextMilestone, predictNextChange, tomorrowPreview } from "@/domain/milestone";

function ctx(overrides: Partial<MilestoneContext> = {}): MilestoneContext {
  return {
    day: 1,
    totalEnergy: 0,
    todayEnergy: 0,
    selectedGoalCount: 0,
    completedTodayCount: 0,
    day7Completed: false,
    petName: "小光",
    ...overrides,
  };
}

describe("predictNextChange", () => {
  it("describes a pet change when the next goal moves the pet", () => {
    expect(predictNextChange(1, 0)).toContain("蛋壳");
    expect(predictNextChange(3, 50)).toContain("蛋里的小伙伴就要出来了");
    expect(predictNextChange(7, 170)).toContain("成长形态");
  });

  it("falls back to the plant when the pet will not move", () => {
    // Pet and plant share thresholds at 10/30/60/180, but the plant has extra
    // steps at 90 and 140 — so 80 -> 90 on Day 7 is a plant-only change.
    expect(predictNextChange(7, 80)).toContain("植物");
  });

  it("falls back to scenery when neither creature nor plant will move", () => {
    expect(predictNextChange(1, 20)).toContain("小石头");
  });

  it("always returns a string", () => {
    for (let day = 1; day <= 7; day += 1) {
      for (let energy = 0; energy <= 210; energy += 10) {
        expect(typeof predictNextChange(day, energy)).toBe("string");
      }
    }
  });
});

describe("tomorrowPreview", () => {
  it("uses the next day's scripted line", () => {
    expect(tomorrowPreview(1)).toBe("明天，这颗蛋可能会发生变化。");
    expect(tomorrowPreview(6)).toBe("明天再来看看，那扇门后面是什么呢？");
  });

  it("still says something warm on the last day", () => {
    expect(tomorrowPreview(7)).toContain("7 天");
  });
});

describe("getNextMilestone", () => {
  it("asks the student to pick goals when nothing is selected", () => {
    const m = getNextMilestone(ctx());
    expect(m.kind).toBe("pick_goals");
    expect(m.ctaHref).toBe("/goals");
  });

  it("counts down the remaining goals today", () => {
    const m = getNextMilestone(ctx({ selectedGoalCount: 3, completedTodayCount: 0 }));
    expect(m.kind).toBe("complete_goal");
    expect(m.title).toBe("再完成 3 个目标");
    expect(m.energyRemaining).toBe(30);

    const m2 = getNextMilestone(
      ctx({
        selectedGoalCount: 3,
        completedTodayCount: 2,
        totalEnergy: 20,
        todayEnergy: 20,
      }),
    );
    expect(m2.title).toBe("再完成 1 个目标");
    expect(m2.energyRemaining).toBe(10);
  });

  it("switches to tomorrow copy once today's goals are done", () => {
    const m = getNextMilestone(
      ctx({
        day: 1,
        totalEnergy: 30,
        todayEnergy: 30,
        selectedGoalCount: 3,
        completedTodayCount: 3,
      }),
    );
    expect(m.kind).toBe("tomorrow");
    expect(m.detail).toBe(tomorrowPreview(1));
  });

  it("celebrates completion on Day 7", () => {
    const m = getNextMilestone(
      ctx({
        day: 7,
        totalEnergy: 180,
        todayEnergy: 30,
        selectedGoalCount: 3,
        completedTodayCount: 3,
        day7Completed: true,
      }),
    );
    expect(m.kind).toBe("continue");
    expect(m.ctaHref).toBe("/history");
  });

  it("opens the finale on the first Day 7 action, whatever the total is", () => {
    // A child on one goal a day arrives on Day 7 with 60 energy. One completed
    // goal must be enough: the ending is earned by acting, not by the total.
    // Before the fix this state had no ending at all — the door stayed shut and
    // the home screen promised a journey that would never finish.
    const m = getNextMilestone(
      ctx({
        day: 7,
        totalEnergy: 70,
        todayEnergy: 10,
        selectedGoalCount: 3,
        completedTodayCount: 1,
      }),
    );
    expect(m.kind).toBe("continue");
    expect(m.title).toBe("你的世界已经完整了");
  });

  it("still pushes for the finale on Day 7 before the first action", () => {
    const m = getNextMilestone(
      ctx({
        day: 7,
        totalEnergy: 70,
        todayEnergy: 0,
        selectedGoalCount: 3,
        completedTodayCount: 0,
      }),
    );
    expect(m.kind).toBe("complete_goal");
    expect(m.title).toBe("再完成 3 个目标");
    // And it must not claim the journey is over while the door is still shut.
    expect(m.detail).not.toContain("完整");
  });

  it("AC3: always answers 'what next?' for every reachable state", () => {
    for (let day = 1; day <= 7; day += 1) {
      for (let selected = 0; selected <= 3; selected += 1) {
        for (let completed = 0; completed <= selected; completed += 1) {
          const totalEnergy = Math.min(210, (day - 1) * 30 + completed * 10);
          const m = getNextMilestone(
            ctx({
              day,
              selectedGoalCount: selected,
              completedTodayCount: completed,
              totalEnergy,
              todayEnergy: completed * 10,
              day7Completed: day === 7 && totalEnergy >= 180,
            }),
          );
          expect(m.title.length).toBeGreaterThan(0);
          expect(m.detail.length).toBeGreaterThan(0);
          expect(m.ctaLabel.length).toBeGreaterThan(0);
          expect(m.ctaHref.startsWith("/")).toBe(true);
        }
      }
    }
  });

  it("never uses failure or homework language (principle P4)", () => {
    const banned = ["作业", "失败", "没完成", "检查", "处罚", "扣"];
    for (let day = 1; day <= 7; day += 1) {
      for (let completed = 0; completed <= 3; completed += 1) {
        const m = getNextMilestone(
          ctx({
            day,
            selectedGoalCount: 3,
            completedTodayCount: completed,
            totalEnergy: completed * 10,
            todayEnergy: completed * 10,
          }),
        );
        const text = `${m.title}${m.detail}${m.ctaLabel}`;
        for (const word of banned) {
          expect(text).not.toContain(word);
        }
      }
    }
  });
});
