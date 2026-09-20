/**
 * The Day 1 -> Day 7 content script (spec section 11).
 *
 * Kept as data so the world scene, the history page and the "tomorrow" teaser
 * all tell exactly the same story.
 */

export interface DayNarrative {
  day: number;
  emoji: string;
  /** Short headline for the day, used on the history timeline. */
  headline: string;
  /** The one-line "what happened" shown under the headline. */
  historyLine: string;
  /** Big emotional copy for the day (shown when it unlocks). */
  majorCopy: string;
  /** Anticipation line shown at the end of the previous day / start of this one. */
  tomorrowPreview: string;
  /** True for the days with a scripted major milestone moment. */
  isMajor: boolean;
}

export const DAY_NARRATIVES: readonly DayNarrative[] = [
  {
    day: 1,
    emoji: "🌱",
    headline: "一个新的世界诞生了。",
    historyLine: "一颗蛋和一棵小芽，来到了这里。",
    majorCopy: "你的世界醒来了。",
    tomorrowPreview: "明天，这颗蛋可能会发生变化。",
    isMajor: false,
  },
  {
    day: 2,
    emoji: "🥚",
    headline: "蛋壳出现了裂缝。",
    historyLine: "好像有什么东西要出生了。",
    majorCopy: "好像有什么东西要出生了。",
    tomorrowPreview: "明天，也许会有一个新伙伴来到你的世界。",
    isMajor: false,
  },
  {
    day: 3,
    emoji: "🐣",
    headline: "小光出生了。",
    historyLine: "一个新的伙伴来到了你的世界。",
    majorCopy: "一个新的伙伴来到了你的世界。",
    tomorrowPreview: "明天，这个小岛会长出新的东西。",
    isMajor: true,
  },
  {
    day: 4,
    emoji: "🌼",
    headline: "岛上开出了第一朵花。",
    historyLine: "还有一只蝴蝶飞过来停了一会。",
    majorCopy: "岛上开出了第一朵花。",
    tomorrowPreview: "明天，小伙伴好像会有一点变化。",
    isMajor: false,
  },
  {
    day: 5,
    emoji: "🦊",
    headline: "小光长大了。",
    historyLine: "因为你也一直在成长。",
    majorCopy: "小光长大了一点。因为你也一直在成长。",
    tomorrowPreview: "明天，岛的右边好像有什么东西。",
    isMajor: true,
  },
  {
    day: 6,
    emoji: "🚪",
    headline: "你发现了被藤蔓挡住的小门。",
    historyLine: "好像还有一个地方没有被发现。明天再来看看。",
    majorCopy: "好像还有一个地方没有被发现。",
    tomorrowPreview: "明天再来看看，那扇门后面是什么呢？",
    isMajor: false,
  },
  {
    day: 7,
    emoji: "🌸",
    headline: "今天，知识树开花了。",
    historyLine: "小光也长成了新的样子，门后的世界打开了。",
    majorCopy: "7 天前，这里只有一颗蛋和一棵小芽。",
    tomorrowPreview: "这段 7 天的旅程，到这里就完整了。",
    isMajor: true,
  },
] as const;

export function getDayNarrative(day: number): DayNarrative {
  return DAY_NARRATIVES.find((n) => n.day === day) ?? DAY_NARRATIVES[0];
}

/** The Day 7 three-beat finale, played back-to-back. */
export const DAY7_FINALE_LINES = [
  "7 天前，这里只有一颗蛋和一棵小芽。",
  "现在，它已经变成了属于你的世界。",
  "这一切，都来自你现实里的成长。",
] as const;
