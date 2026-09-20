import type { GoalTemplate } from "@/domain/types";

/**
 * The five preset goals (spec section 4).
 *
 * Phase 0 deliberately does not allow free text: fewer meaningless tasks and
 * cleaner comparison across students.
 */
export const GOAL_TEMPLATES: readonly GoalTemplate[] = [
  {
    id: "reading",
    category: "reading",
    title: "阅读 20 分钟",
    description: "读一本你喜欢的书",
    energy: 10,
    emoji: "📖",
  },
  {
    id: "study",
    category: "study",
    title: "专注学习 20 分钟",
    description: "专心做一件事，中间不被打断",
    energy: 10,
    emoji: "✏️",
  },
  {
    id: "exercise",
    category: "exercise",
    title: "运动 20 分钟",
    description: "跑一跑、跳一跳，让身体动起来",
    energy: 10,
    emoji: "🏃",
  },
  {
    id: "interest",
    category: "interest",
    title: "练习一个兴趣",
    description: "画画、乐器、拼搭，什么都算",
    energy: 10,
    emoji: "🎨",
  },
  {
    id: "helping",
    category: "helping",
    title: "帮助家人一件事",
    description: "做一件让家人轻松一点的小事",
    energy: 10,
    emoji: "❤️",
  },
] as const;

export function getGoalTemplate(templateId: string): GoalTemplate | undefined {
  return GOAL_TEMPLATES.find((t) => t.id === templateId);
}

/** Short label used in the plant page's per-category record. */
export const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  reading: "阅读",
  study: "学习",
  exercise: "运动",
  interest: "兴趣",
  helping: "帮助家人",
};

export const CATEGORY_EMOJI: Readonly<Record<string, string>> = {
  reading: "📖",
  study: "✏️",
  exercise: "🏃",
  interest: "🎨",
  helping: "❤️",
};
