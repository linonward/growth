import { expect, test } from "@playwright/test";

import {
  completeFirstRun,
  completeFullDay,
  completeGoal,
  DAILY_GOALS,
  gotoDay,
  readPersistedState,
  resetApp,
  selectGoals,
  skipRewardToNext,
} from "./helpers";

/**
 * The full 7-day happy path (spec section 26).
 *
 * Walks Day 1 -> Day 7 exactly as the experiment script describes, asserting the
 * Day Gates, every major milestone, and the final continue intent.
 */
test("完整 7 天流程：Day 1 → Day 7", async ({ page }) => {
  await resetApp(page);
  await completeFirstRun(page, "小光岛");

  // ---- Day 1: the world is born -------------------------------------------
  await completeFullDay(page, { initiative: "self" });
  await page.goto("/");
  await expect(page.getByTestId("today-energy")).toHaveText("30 / 30");
  await expect(page.getByTestId("pet-sprite")).toHaveAttribute(
    "data-pet-state",
    "wiggling_egg",
  );
  // Day 1 must never hatch (spec section 25).
  await expect(page.getByTestId("pet-sprite")).not.toHaveAttribute(
    "data-pet-state",
    "baby",
  );

  // ---- Day 2: the egg cracks ----------------------------------------------
  await gotoDay(page, 2);
  await page.goto("/");
  await expect(page.getByTestId("pet-sprite")).toHaveAttribute(
    "data-pet-state",
    "cracked_egg",
  );
  await completeFullDay(page);

  // ---- Day 3: the pet is born ---------------------------------------------
  await gotoDay(page, 3);
  await page.goto("/");
  await expect(page.getByTestId("pet-sprite")).toHaveAttribute("data-pet-state", "baby");
  await completeFullDay(page);

  // ---- Day 4: the world expands (no pet evolution on purpose) -------------
  await gotoDay(page, 4);
  await page.goto("/");
  await expect(page.getByTestId("pet-sprite")).toHaveAttribute("data-pet-state", "baby");
  await completeFullDay(page);

  // ---- Day 5: the pet grows up --------------------------------------------
  await gotoDay(page, 5);
  await page.goto("/");
  await expect(page.getByTestId("pet-sprite")).toHaveAttribute("data-pet-state", "young");
  await completeFullDay(page);

  // ---- Day 6: anticipation, and the gate stays shut ------------------------
  await gotoDay(page, 6);
  await page.goto("/");
  await expect(page.getByTestId("mystery-gate")).toBeVisible();
  await completeFullDay(page);
  await page.goto("/");
  // Completing everything on Day 6 must still not open it.
  await expect(page.getByTestId("new-area")).toHaveCount(0);
  await expect(page.getByTestId("rainbow-gate")).toHaveCount(0);

  // ---- Day 7: the finale ---------------------------------------------------
  await gotoDay(page, 7);
  await page.goto("/");
  // 180 energy, but Day 7 has not been acted on yet.
  await expect(page.getByTestId("pet-sprite")).toHaveAttribute("data-pet-state", "young");
  await expect(page.getByTestId("plant-sprite")).toHaveAttribute(
    "data-plant-state",
    "tree",
  );
  await expect(page.getByTestId("new-area")).toHaveCount(0);

  await page.goto("/goals");
  await selectGoals(page, [...DAILY_GOALS]);

  // 180 energy carried in from Days 1-6 plus the first Day-7 goal crosses the
  // finale threshold, so the three-beat sequence plays on this completion.
  await page.getByTestId("goal-item-reading").click();
  await expect(page.getByTestId("goal-confirm-dialog")).toBeVisible();
  await page.getByTestId("goal-confirm-yes").click();
  await expect(page.getByTestId("reward-overlay")).toBeVisible();
  await skipRewardToNext(page);
  await page.getByTestId("reward-continue").click();

  // Plant bloom -> pet evolved -> new area.
  await expect(page.getByTestId("finale-overlay")).toBeVisible();
  await expect(page.getByTestId("finale-event-plant")).toBeVisible();
  await page.getByTestId("finale-skip").click();
  await expect(page.getByTestId("finale-summary")).toBeVisible();
  await page.getByTestId("finale-continue").click();

  // "继续我的成长" only records intent in Phase 0.
  await expect(page).toHaveURL(/\/history$/);

  await page.goto("/");
  await expect(page.getByTestId("pet-sprite")).toHaveAttribute(
    "data-pet-state",
    "evolved",
  );
  await expect(page.getByTestId("plant-sprite")).toHaveAttribute(
    "data-plant-state",
    "bloom",
  );
  await expect(page.getByTestId("new-area")).toBeVisible();

  const state = await readPersistedState(page);
  expect(state.day7Completed).toBe(true);
  expect(state.continueRequested).toBe(true);
});

test("Day 1 cannot be skipped: the pet stays an egg with maximum energy", async ({
  page,
}) => {
  await resetApp(page);
  await completeFirstRun(page);

  await gotoDay(page, 1);
  for (let i = 0; i < 21; i += 1) {
    await page.getByTestId("debug-energy-plus").click();
  }
  await page.getByTestId("debug-toggle").click(); // collapse so it is out of the way
  await page.goto("/");
  await expect(page.getByTestId("pet-sprite")).not.toHaveAttribute(
    "data-pet-state",
    "baby",
  );
  await expect(page.getByTestId("pet-sprite")).toHaveAttribute(
    "data-pet-state",
    "wiggling_egg",
  );
});

test("progress survives a page reload", async ({ page }) => {
  await resetApp(page);
  await completeFirstRun(page);
  await completeFullDay(page);

  await page.reload();
  await page.goto("/");
  await expect(page.getByTestId("today-energy")).toHaveText("30 / 30");
  await expect(page.getByTestId("pet-sprite")).toHaveAttribute(
    "data-pet-state",
    "wiggling_egg",
  );
});

test("Reset Prototype fully restores Day 1", async ({ page }) => {
  await resetApp(page);
  await completeFirstRun(page);
  await completeFullDay(page);
  await gotoDay(page, 3);

  await page.goto("/?debug=1");
  await page.getByTestId("debug-reset").click();

  await page.goto("/");
  await expect(page.getByTestId("day-badge")).toContainText("Day 1");
  await expect(page.getByTestId("today-energy")).toHaveText("0 / 30");
  await expect(page.getByTestId("pet-sprite")).toHaveAttribute("data-pet-state", "egg");
  await expect(page.getByTestId("plant-sprite")).toHaveAttribute(
    "data-plant-state",
    "seed",
  );
});

test("the initiative question is asked once and is exported", async ({ page }) => {
  await resetApp(page);
  await completeFirstRun(page);
  await selectGoals(page, [...DAILY_GOALS]);

  // First completion of the day: the question appears at reward stage 4.
  await completeGoal(page, "reading", { initiative: "self" });
  await completeGoal(page, "study");

  await page.goto("/debug/export");
  await expect(page.getByTestId("export-page")).toBeVisible();
  await expect(page.getByTestId("export-summary")).toContainText("自主 / 被提醒：");
  const json = (await page.getByTestId("export-json").textContent()) ?? "";
  const parsed = JSON.parse(json);
  expect(parsed.summary.initiativeSelf).toBe(1);
  expect(parsed.summary.initiativePrompted).toBe(0);
  expect(parsed.summary.goalsCompleted).toBe(2);
  expect(parsed.summary.totalEnergy).toBe(20);
  expect(parsed.days).toHaveLength(7);
});

test("the debug panel is hidden without ?debug=1", async ({ page }) => {
  await resetApp(page);
  await completeFirstRun(page);
  await page.goto("/");
  await expect(page.getByTestId("debug-panel")).toHaveCount(0);

  await page.goto("/?debug=1");
  await expect(page.getByTestId("debug-panel")).toBeVisible();
});

/**
 * Guards the bottom navigation layout.
 *
 * Regression: the links inherited only their text width (22px), sat flush left
 * in their cell, and fell below the 44x44 minimum tap target from spec §21.
 */
test("底部导航：四个入口等宽居中，且点击区域不小于 44x44", async ({ page }) => {
  await resetApp(page);
  await completeFirstRun(page);
  await page.goto("/plant");

  const navBox = await page.locator("nav").boundingBox();
  expect(navBox).not.toBeNull();

  const links = page.locator("nav a");
  await expect(links).toHaveCount(4);

  const cellWidth = navBox!.width / 4;
  for (let i = 0; i < 4; i += 1) {
    const box = await links.nth(i).boundingBox();
    expect(box).not.toBeNull();
    // Spec §21: minimum tap target.
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    // Each entry fills exactly one quarter of the bar...
    expect(Math.abs(box!.width - cellWidth)).toBeLessThan(2);
    // ...starting at that quarter's left edge, so its content is centred.
    expect(Math.abs(box!.x - (navBox!.x + i * cellWidth))).toBeLessThan(2);
  }

  // Exactly one entry is marked current.
  await expect(page.getByTestId("nav-plant")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("nav-world")).not.toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("nav-goals")).not.toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("nav-pet")).not.toHaveAttribute("aria-current", "page");

  // The nav stays inside the centred mobile frame on a desktop viewport.
  await page.setViewportSize({ width: 1280, height: 900 });
  const wideNav = await page.locator("nav").boundingBox();
  expect(wideNav!.width).toBeLessThanOrEqual(430);
  expect(Math.abs(wideNav!.x - (1280 - wideNav!.width) / 2)).toBeLessThan(2);
});

/**
 * Guards a bug class that is invisible to unit tests: a CSS transform animation
 * overrides an SVG `transform` attribute, so an element that combines both
 * silently collapses to the origin while still being "present" in the DOM.
 */
test("animated scenery keeps its position", async ({ page }) => {
  await resetApp(page);
  await completeFirstRun(page);
  await gotoDay(page, 6);
  await page.goto("/");

  const scene = page.getByTestId("world-scene");
  await expect(scene).toBeVisible();
  const sceneBox = await scene.boundingBox();
  expect(sceneBox).not.toBeNull();

  /** Position of an element's centre, as a 0..1 fraction of the scene. */
  async function centreOf(locator: ReturnType<typeof page.getByTestId>) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    return {
      x: (box!.x + box!.width / 2 - sceneBox!.x) / sceneBox!.width,
      y: (box!.y + box!.height / 2 - sceneBox!.y) / sceneBox!.height,
    };
  }

  // The butterfly sits high on the right of the scene (344, 196 of 390x340).
  const butterfly = await centreOf(page.getByTestId("butterfly"));
  expect(butterfly.x).toBeGreaterThan(0.6);
  expect(butterfly.y).toBeGreaterThan(0.3);
  expect(butterfly.y).toBeLessThan(0.8);

  // Clouds must be spread across the sky rather than stacked at the origin.
  const clouds = page.getByTestId("cloud");
  await expect(clouds).toHaveCount(3);
  const cloudXs: number[] = [];
  for (let i = 0; i < 3; i += 1) {
    cloudXs.push((await centreOf(clouds.nth(i))).x);
  }
  expect(Math.max(...cloudXs) - Math.min(...cloudXs)).toBeGreaterThan(0.2);

  // Both flowers of the Day 4 cluster must be on screen.
  const flowers = await centreOf(page.getByTestId("flowers"));
  expect(flowers.x).toBeGreaterThan(0.6);
  expect(flowers.y).toBeGreaterThan(0.5);
});
