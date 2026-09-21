import type { GoalGroup, GoalTemplate } from "@/domain/types";

/**
 * The Phase 0 goal library.
 *
 * Two rules shape every line here (see the design notes in README):
 *
 * 1. **Concrete.** Each goal names a subject, an action AND an amount
 *    ("数学 · 计算" + "15 分钟"). The old "专注学习 20 分钟" told a child nothing
 *    to actually do and gave them no way to tell whether they had done it.
 *
 * 2. **Phrased as what to do, never what to stop doing.** A child who drifts off
 *    task or leaves their seat cannot act on "不要走神" — it names a behaviour to
 *    suppress, and it cannot be self-assessed. Each of those becomes a concrete,
 *    countable action instead, and where possible it gives the impulse somewhere
 *    to go (想站起来时先举手 keeps the movement, only changes its form) rather
 *    than forbidding it.
 *
 * Every goal is also deliberately small enough to succeed most days, and the
 * copy says so where it matters — 举手回答「对错都算」, 问老师「会不会都没关系」.
 * For a child who already struggles, rewarding the *action* rather than the
 * *outcome* is the difference between a goal and another failure.
 *
 * Free text stays out of scope (spec §0): these are the only options, and a
 * student picks at most three.
 */
export const GOAL_TEMPLATES: readonly GoalTemplate[] = [
  /* ------------------------------------------------------- 学习（家里） */
  {
    id: "math",
    category: "math",
    group: "study",
    title: "数学 · 计算",
    amount: "15 分钟",
    description: "口算、竖式都算",
    energy: 10,
    emoji: "🔢",
  },
  {
    id: "chinese",
    category: "chinese",
    group: "study",
    title: "语文 · 认字",
    amount: "6 个字",
    description: "会读、会写才算",
    energy: 10,
    emoji: "📝",
  },
  {
    id: "english",
    category: "english",
    group: "study",
    title: "英语",
    amount: "20 分钟",
    description: "跟读、听音频都算",
    energy: 10,
    emoji: "🔤",
  },
  {
    id: "reading",
    category: "reading",
    group: "study",
    title: "阅读",
    amount: "20 分钟",
    description: "读一本你喜欢的书",
    energy: 10,
    emoji: "📖",
  },

  /* ------------------------------------------------------------- 学校 */
  {
    id: "participate",
    category: "participate",
    group: "school",
    title: "上课举手回答",
    amount: "1 次",
    description: "对错都算，举手就算",
    energy: 10,
    emoji: "🙋",
  },
  {
    id: "ask_teacher",
    category: "ask_teacher",
    group: "school",
    title: "有不会的问老师",
    amount: "1 次",
    description: "会不会都没关系，问了就算",
    energy: 10,
    emoji: "💬",
  },
  {
    id: "stay_seated",
    category: "stay_seated",
    group: "school",
    title: "想站起来时，先举手",
    amount: "1 次",
    description: "站起来也行，只要先举手",
    energy: 10,
    emoji: "✋",
  },
  {
    id: "attend",
    category: "attend",
    group: "school",
    title: "老师讲课时看着老师",
    amount: "一节课",
    description: "看着老师或黑板就算",
    energy: 10,
    emoji: "👀",
  },

  /* ------------------------------------------------------------- 生活 */
  {
    id: "exercise",
    category: "exercise",
    group: "life",
    title: "运动",
    amount: "20 分钟",
    description: "跑一跑、跳一跳，让身体动起来",
    energy: 10,
    emoji: "🏃",
  },
  {
    id: "interest",
    category: "interest",
    group: "life",
    title: "练习一个兴趣",
    amount: "15 分钟",
    description: "画画、乐器、拼搭，什么都算",
    energy: 10,
    emoji: "🎨",
  },
  {
    id: "helping",
    category: "helping",
    group: "life",
    title: "帮助家人一件事",
    amount: "1 件",
    description: "做一件让家人轻松一点的小事",
    energy: 10,
    emoji: "❤️",
  },
] as const;

/** Display order and labels for the three parts of the day. */
export const GOAL_GROUPS: readonly {
  id: GoalGroup;
  label: string;
  hint: string;
}[] = [
  { id: "study", label: "学习", hint: "在家里" },
  { id: "school", label: "学校", hint: "白天" },
  { id: "life", label: "生活", hint: "随时" },
] as const;

export function getGoalTemplate(templateId: string): GoalTemplate | undefined {
  return GOAL_TEMPLATES.find((t) => t.id === templateId);
}

export function templatesInGroup(group: GoalGroup): readonly GoalTemplate[] {
  return GOAL_TEMPLATES.filter((t) => t.group === group);
}

/** Short label used in the plant page's per-category record. */
export const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  math: "数学计算",
  chinese: "语文认字",
  english: "英语",
  reading: "阅读",
  participate: "举手回答",
  ask_teacher: "问老师",
  stay_seated: "先举手再起身",
  attend: "看着老师",
  exercise: "运动",
  interest: "兴趣",
  helping: "帮助家人",
};
