"use client";

import { useMemo } from "react";

import { IconSparkle } from "@/components/ui/icons";
import { THEME_LABELS, themeColors } from "@/components/world/themes";
import {
  nextLockedTheme,
  resolveWorldTheme,
  unlockedThemeCount,
  WORLD_THEME_IDS,
  type WorldThemeId,
} from "@/domain/world-theme";
import { selectStarsEarned, usePrototypeStore } from "@/store/prototype-store";

/**
 * Stars and what they have opened.
 *
 * Built with `useMemo` from a primitive selector rather than selected as an
 * object: zustand v5 reads through `useSyncExternalStore`, so a selector that
 * returns a fresh object every call loops forever. That is not a style
 * preference — written the other way it crashed this screen, and the e2e test
 * caught it rather than a child.
 */
function useThemeUnlocks() {
  const stars = usePrototypeStore(selectStarsEarned);
  return useMemo(
    () => ({
      stars,
      unlocked: unlockedThemeCount(stars),
      next: nextLockedTheme(stars),
    }),
    [stars],
  );
}

/**
 * Swatches for each look, so the child picks by seeing rather than by reading.
 *
 * A locked look is shown but not tappable, with what it needs — the alternative
 * (hiding it) would make the ladder invisible and the stars meaningless. This is
 * the one place in the app where something is deliberately out of reach, and it
 * sits next to the star garden that says how many stars exist.
 */
function ThemeSwatch({ id, lockedNeed }: { id: WorldThemeId; lockedNeed?: number }) {
  const stored = usePrototypeStore((s) => s.profile.worldTheme);
  const current = resolveWorldTheme(stored);
  const setTheme = usePrototypeStore((s) => s.setTheme);
  const colors = themeColors(id);
  const { label } = THEME_LABELS[id];
  const active = current === id;
  const locked = lockedNeed !== undefined;

  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => setTheme(id)}
      data-testid={`theme-${id}`}
      data-active={active}
      data-locked={locked}
      aria-pressed={active}
      className={`flex flex-1 flex-col items-center gap-1.5 rounded-card px-2 py-3 transition ${
        active ? "border border-leaf-deep/45 bg-leaf-wash shadow-soft" : "card"
      } ${locked ? "opacity-60" : ""}`}
    >
      {/*
        The rendered swatch doubles as the checkable evidence that this theme's
        colours differ from the others: a test reads these two attributes rather
        than comparing screenshots (which animation frames make unreliable).
      */}
      <svg
        viewBox="0 0 44 30"
        width={44}
        height={30}
        data-testid={`theme-swatch-${id}`}
        data-sky={colors.sky.bright[0]}
        data-ground={colors.ground.front.plain}
        aria-hidden
      >
        <rect width="44" height="30" rx="6" fill={colors.sky.bright[0]} />
        <rect y="17" width="44" height="8" rx="3" fill={colors.ground.near.plain} />
        <rect y="23" width="44" height="7" rx="3" fill={colors.ground.front.plain} />
        <circle cx="34" cy="8" r="4" fill={colors.sunCore} />
      </svg>
      <span className="text-[12px] font-semibold text-ink">{label}</span>
      <span className="text-[10px] leading-none text-ink-faint">
        {locked ? `还差 ${lockedNeed} 颗星` : active ? "正在用" : "换上"}
      </span>
    </button>
  );
}

/** The star count and the next unlock, or nothing when the ladder is finished. */
function ThemeProgress() {
  const { stars, next } = useThemeUnlocks();

  if (!next) {
    return (
      <p className="mt-3 text-[12px] text-ink-faint" data-testid="theme-progress">
        已经收集到 {stars} 颗星，所有的世界样子都打开了。
      </p>
    );
  }
  const { label } = THEME_LABELS[next.id];
  return (
    <p
      className="mt-3 flex items-center gap-1.5 text-[12px] text-ink-soft"
      data-testid="theme-progress"
    >
      <IconSparkle size={13} className="text-growth" aria-hidden />有 {stars} 颗星了 · 再{" "}
      {next.starsNeeded} 颗就能打开「{label}」
    </p>
  );
}

/**
 * The world's look, chosen by the child.
 *
 * On the home screen rather than in onboarding on purpose: nothing is unlocked
 * on Day 1, so a picker at setup would be a choice with one option. Here it
 * appears alongside the star garden that pays for it.
 */
export function ThemePanel() {
  const { unlocked } = useThemeUnlocks();

  return (
    <section className="px-5" data-testid="theme-panel">
      <h2 className="t-caption mb-2">换个样子</h2>
      <div className="flex gap-2.5">
        {WORLD_THEME_IDS.map((id, index) => (
          <ThemeSwatch
            key={id}
            id={id}
            lockedNeed={index < unlocked ? undefined : index}
          />
        ))}
      </div>
      <ThemeProgress />
    </section>
  );
}

/** One line inside the reward moment, when this goal opened a new look. */
export function ThemeUnlockNote({ id }: { id: WorldThemeId }) {
  const { label } = THEME_LABELS[id];
  return (
    <p
      className="mt-3 rounded-card bg-leaf-wash px-3 py-2 text-[13px] font-semibold text-leaf-deep"
      data-testid="theme-unlock-note"
    >
      新的世界样子打开了：「{label}」
    </p>
  );
}
