/**
 * Which look a child's world is wearing, and what it takes to change it.
 *
 * ## Read this before adding a theme or changing a price
 *
 * This is an **unlock economy**: themes are bought with stars, and stars come
 * from completing goals. That is deliberately close to the token-and-shop
 * mechanic Phase 0 exists to test — see
 * `docs/ux-research/world-themes-design.md`, where a free start-up choice was
 * recommended and this was chosen anyway.
 *
 * The consequence is not technical. It is that **a child returning may now be
 * returning for the unlock rather than to see the world change**, and those two
 * motives look identical in retention data. Any report written from this build
 * has to say so, or the D8 number will be read as evidence for the core bet when
 * it is not.
 *
 * Two choices keep the damage small:
 *
 * - **The currency is stars, which already existed** (`starsEarned` = the number
 *   of days with an action). No new counter and no new event; completing goals
 *   still changes the world exactly as before.
 * - **Unlocks are permanent.** A theme that became available never becomes
 *   unavailable again, because taking something back from a six-year-old reads
 *   as a loss, and losses are what this product does not do (P5).
 *
 * The id, the ladder and the rule are data, so they live here rather than beside
 * the palette: `domain/` must stay free of React and the browser (spec §17), and
 * the export has to segment on the same values the UI offers.
 */

export type WorldThemeId = "sunny" | "night" | "autumn";

/**
 * The ladder, cheapest first. **Order is the price**: index `n` costs `n` stars,
 * so the ladder can never disagree with itself about what something costs.
 *
 * The prices put the second look on Day 3 and the third on Day 5 for a child who
 * acts every day. Those are days when no pet or plant threshold is crossed for
 * some completion rates (see `domain/reward.ts`) — when an extra reason to come
 * back is worth the most, and therefore exactly why this mechanic is a threat to
 * the experiment rather than a neutral addition.
 */
export const WORLD_THEME_IDS: readonly WorldThemeId[] = ["sunny", "night", "autumn"];

/** The look every new world starts with, and the one the ladder makes free. */
export const DEFAULT_THEME: WorldThemeId = "sunny";

export function isWorldThemeId(value: unknown): value is WorldThemeId {
  return typeof value === "string" && WORLD_THEME_IDS.includes(value as WorldThemeId);
}

/**
 * Read a stored theme, falling back to the default.
 *
 * A world saved before themes existed has no value, and one saved by a build
 * with a theme this build does not know must not render nothing — both land on
 * the default rather than throwing.
 */
export function resolveWorldTheme(value: unknown): WorldThemeId {
  return isWorldThemeId(value) ? value : DEFAULT_THEME;
}

/** Index in the ladder. 0 is free; each step up costs one more star. */
export function themeTier(id: WorldThemeId): number {
  return Math.max(0, WORLD_THEME_IDS.indexOf(id));
}

/**
 * How many looks a given star count has opened.
 *
 * Tier `n` costs `n` stars, so this is the largest `n` with `cost <= earned`.
 * Past the end it simply returns everything, which keeps a world saved with a
 * longer ladder working if the ladder later shrinks.
 */
export function unlockedThemeCount(stars: number): number {
  const earned = Number.isFinite(stars) ? Math.max(0, Math.floor(stars)) : 0;
  let count = 1;
  while (count < WORLD_THEME_IDS.length && earned >= count) count += 1;
  return count;
}

/** Can this world wear this look? Depends on stars earned, never on unspent. */
export function isThemeUnlocked(id: WorldThemeId, stars: number): boolean {
  return themeTier(id) < unlockedThemeCount(stars);
}

/** The next look to open, or null when the whole ladder is open. */
export function nextLockedTheme(
  stars: number,
): { id: WorldThemeId; starsNeeded: number } | null {
  const count = unlockedThemeCount(stars);
  const next = WORLD_THEME_IDS[count];
  if (!next) return null;
  const earned = Number.isFinite(stars) ? Math.max(0, Math.floor(stars)) : 0;
  return { id: next, starsNeeded: Math.max(1, count - earned) };
}
