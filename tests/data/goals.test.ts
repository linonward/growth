import { describe, expect, it } from "vitest";

import {
  CATEGORY_LABELS,
  GOAL_GROUPS,
  GOAL_TEMPLATES,
  templatesInGroup,
} from "@/data/goals";
import { MAX_GOALS_PER_DAY } from "@/domain/constants";
import { ANALYTICS_EVENT_NAMES } from "@/domain/types";

/**
 * The goal library encodes two design rules that are easy to break by adding
 * "just one more goal". These tests are the guard.
 */
describe("goal library — concreteness", () => {
  it("every goal states a concrete amount", () => {
    for (const template of GOAL_TEMPLATES) {
      expect(template.amount, `${template.id} has no amount`).toBeTruthy();
      // Must be a measure, not a vague word. "15 分钟" / "6 个字" / "1 次".
      expect(template.amount).toMatch(/\d|一/);
    }
  });

  it("every learning goal names its subject", () => {
    const learning = templatesInGroup("study");
    expect(learning.map((t) => t.id).sort()).toEqual(
      ["chinese", "english", "math", "reading"].sort(),
    );
    // The old catch-all must not come back.
    expect(learning.some((t) => t.title.includes("专注学习"))).toBe(false);
  });

  it("every goal has a description that says what counts", () => {
    for (const template of GOAL_TEMPLATES) {
      expect(template.description.length).toBeGreaterThan(3);
    }
  });

  it("keeps the daily cap at three", () => {
    expect(MAX_GOALS_PER_DAY).toBe(3);
    expect(GOAL_TEMPLATES.length).toBeGreaterThan(MAX_GOALS_PER_DAY);
  });
});

describe("goal library — positive phrasing", () => {
  /**
   * A child who drifts off task cannot act on "don't drift off task". Goals must
   * name what to DO.
   */
  const NEGATIVE = ["不要", "不能", "别", "不准", "禁止", "不许", "避免"];

  /** The behaviours these goals exist to address must not be named as problems. */
  const PROBLEM_WORDS = ["走神", "乱走", "乱跑", "坐不住", "发呆", "分心", "多动"];

  /** spec §1 P4 — no homework/surveillance framing. */
  const BANNED = ["作业", "检查", "家长任务", "处罚", "失败", "没完成", "扣"];

  const allCopy = GOAL_TEMPLATES.map((t) => `${t.title}|${t.description}|${t.amount}`);

  it("never phrases a goal as something to stop doing", () => {
    for (const copy of allCopy) {
      for (const word of NEGATIVE) {
        expect(copy, `"${copy}" uses negative phrasing`).not.toContain(word);
      }
    }
  });

  it("never names the problem behaviour", () => {
    for (const copy of allCopy) {
      for (const word of PROBLEM_WORDS) {
        expect(copy, `"${copy}" names the problem behaviour`).not.toContain(word);
      }
    }
  });

  it("never uses homework or surveillance language", () => {
    for (const copy of allCopy) {
      for (const word of BANNED) {
        expect(copy, `"${copy}" uses banned word "${word}"`).not.toContain(word);
      }
    }
  });

  it("rewards the action, not the outcome", () => {
    const participate = GOAL_TEMPLATES.find((t) => t.id === "participate");
    const ask = GOAL_TEMPLATES.find((t) => t.id === "ask_teacher");
    // Getting it wrong, or not understanding, must still count.
    expect(participate?.description).toContain("对错都算");
    expect(ask?.description).toContain("问了就算");
  });

  it("gives the urge somewhere to go instead of forbidding it", () => {
    const seated = GOAL_TEMPLATES.find((t) => t.id === "stay_seated");
    // The goal is not "sit still"; it is "raise your hand first", so the
    // movement itself is still allowed.
    expect(seated?.title).toContain("先举手");
    expect(seated?.description).toContain("站起来也行");
  });
});

describe("goal library — structure", () => {
  it("covers the three parts of the day", () => {
    expect(GOAL_GROUPS.map((g) => g.id)).toEqual(["study", "school", "life"]);
    for (const group of GOAL_GROUPS) {
      expect(templatesInGroup(group.id).length).toBeGreaterThan(0);
    }
  });

  it("has a label for every category", () => {
    for (const template of GOAL_TEMPLATES) {
      expect(
        CATEGORY_LABELS[template.category],
        `${template.category} has no label`,
      ).toBeTruthy();
    }
  });

  it("uses unique ids", () => {
    const ids = GOAL_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps goal_type in the analytics schema's vocabulary", () => {
    // goal_completed carries goal_type = template id, so these ids travel to
    // PostHog and should stay stable and readable.
    for (const template of GOAL_TEMPLATES) {
      expect(template.id).toMatch(/^[a-z_]+$/);
    }
    expect(ANALYTICS_EVENT_NAMES).toContain("goal_completed");
  });
});
