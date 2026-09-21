import type { ChipTint } from "@/components/ui/primitives";
import type { GoalCategory } from "@/domain/types";

/**
 * Tint per goal category.
 *
 * One source for both the goal list and the plant record, so a subject keeps
 * the same colour everywhere. Grouped loosely by part of the day: learning
 * leans cool, school leans warm, life uses the nature palette.
 */
export const CATEGORY_TINT: Readonly<Record<GoalCategory, ChipTint>> = {
  // 学习（家里）
  math: "sky",
  chinese: "blossom",
  english: "mystery",
  reading: "leaf",
  // 学校
  participate: "growth",
  ask_teacher: "sky",
  stay_seated: "blossom",
  attend: "mystery",
  // 生活
  exercise: "leaf",
  interest: "growth",
  helping: "blossom",
};
