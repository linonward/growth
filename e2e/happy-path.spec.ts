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
  writePersistedState,
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
  await page.getByTestId(`goal-item-${DAILY_GOALS[0]}`).click();
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
  await completeGoal(page, DAILY_GOALS[0], { initiative: "self" });
  await completeGoal(page, DAILY_GOALS[1]);

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

test("the experimenter records an age band and it reaches the export", async ({
  page,
}) => {
  await resetApp(page);
  await completeFirstRun(page);

  // The picker lives in the debug panel: it is a study-setup action, so it must
  // never be in the student's flow.
  await page.goto("/?debug=1");
  await expect(page.getByTestId("debug-panel")).toBeVisible();
  // Before anything is recorded the panel says so instead of showing a guess.
  await expect(page.getByTestId("debug-age-band-value")).toHaveText("未记录");

  await page.getByTestId("debug-age-6-7").click();
  await expect(page.getByTestId("debug-age-band-value")).toHaveText("6-7");

  // The export is what the analysis actually reads, so assert the field there
  // rather than only in the panel.
  await page.goto("/debug/export");
  await expect(page.getByTestId("export-age-band")).toHaveText("一年级");
  const json = (await page.getByTestId("export-json").textContent()) ?? "";
  const parsed = JSON.parse(json);
  expect(parsed.profile.ageBand).toBe("6-7");
  // Every event carries the key. Events emitted before the band was recorded
  // stay explicitly null (that is the honest record — this device's first open
  // predates setup), and nothing must retroactively claim a band.
  expect(
    parsed.events.every((e: { props: Record<string, unknown> }) =>
      Object.hasOwn(e.props, "age_band"),
    ),
  ).toBe(true);
  expect(parsed.events.at(-1).props.age_band).toBe("6-7");
});

test("导出带上 D8 窗口，并说明什么时候才能判读它", async ({ page }) => {
  // D8 is the primary acceptance point and it is a property of WHEN the file is
  // taken, so an export from inside the week must say "not yet" rather than
  // silently reporting zero returns.
  await resetApp(page);
  await completeFirstRun(page);
  await selectGoals(page, [DAILY_GOALS[0]]);
  await completeGoal(page, DAILY_GOALS[0]);

  await page.goto("/debug/export");
  await expect(page.getByTestId("export-post-week")).toHaveText("还没有");
  await expect(page.getByTestId("export-summary")).toContainText("主验收点");

  const parsed = JSON.parse((await page.getByTestId("export-json").textContent()) ?? "");
  expect(parsed.postWeek).toMatchObject({ daysActive: 0, firstDayActive: null });
  // The week itself is still reported, separately.
  expect(parsed.summary.dayRetention["1"]).toBe(true);
});

test("小星星园随每一次「今天做到了」长出来，并在界面上可见", async ({ page }) => {
  // Regression: the garden is only as good as the plumbing from the store to
  // the world state. It was first wired into the selectors but not into the hook
  // the pages actually read, so it rendered nothing while every domain test
  // passed. This walks the real screen.
  await resetApp(page);
  await completeFirstRun(page);

  // Day 1: nothing earned yet, so no garden at all.
  await selectGoals(page, [DAILY_GOALS[0]]);
  await page.goto("/");
  await expect(page.getByTestId("star-garden")).toHaveCount(0);

  await completeGoal(page, DAILY_GOALS[0]);
  await page.goto("/");
  await expect(page.getByTestId("star-garden")).toHaveAttribute("data-stars", "1");

  // Day 2: a second day with an action makes it two.
  await gotoDay(page, 2);
  await selectGoals(page, [DAILY_GOALS[0]]);
  await page.goto("/");
  await expect(page.getByTestId("star-garden")).toHaveAttribute("data-stars", "1");
  await completeGoal(page, DAILY_GOALS[0]);
  await page.goto("/");
  await expect(page.getByTestId("star-garden")).toHaveAttribute("data-stars", "2");
});

test("reward_viewed records how much of the animation was actually watched", async ({
  page,
}) => {
  await resetApp(page);
  await completeFirstRun(page);
  await selectGoals(page, [...DAILY_GOALS]);

  // First goal: let the sequence run to the end on its own. completeGoal()
  // always skips, so this one is driven by hand.
  await page.goto("/goals");
  await page.getByTestId(`goal-item-${DAILY_GOALS[0]}`).click();
  await page.getByTestId("goal-confirm-yes").click();
  await expect(page.getByTestId("reward-overlay")).toBeVisible();
  await expect(page.getByTestId("reward-stage-next")).toBeVisible({ timeout: 15000 });
  const initiative = page.getByTestId("initiative-self");
  if (await initiative.isVisible().catch(() => false)) await initiative.click();
  await page.getByTestId("reward-continue").click();

  // Second goal: skip immediately, on stage 1.
  await page.goto("/goals");
  await page.getByTestId(`goal-item-${DAILY_GOALS[1]}`).click();
  await page.getByTestId("goal-confirm-yes").click();
  await expect(page.getByTestId("reward-overlay")).toBeVisible();
  await page.getByTestId("reward-skip").click();
  await page.getByTestId("reward-continue").click();

  await page.goto("/debug/export");
  await expect(page.getByTestId("export-page")).toBeVisible();
  const parsed = JSON.parse((await page.getByTestId("export-json").textContent()) ?? "");
  const rewards = parsed.events
    .filter((e: { name: string }) => e.name === "reward_viewed")
    .map((e: { props: { stages_seen: number; skipped: boolean } }) => e.props);

  expect(rewards).toHaveLength(2);
  // Watched to the end.
  expect(rewards[0].stages_seen).toBe(4);
  expect(rewards[0].skipped).toBe(false);
  // Skipping jumps to the last stage; if that were counted, this would be 4 too.
  expect(rewards[1].stages_seen).toBe(1);
  // ...and `skipped` is what tells the two apart, now that tapping also
  // advances the sequence.
  expect(rewards[1].skipped).toBe(true);
});

test("reward 可以轻点继续，也可以真正跳过", async ({ page }) => {
  // The timings used to be fixed for an adult reading speed, and the only
  // visible control was a faint grey "跳过" in the corner. A child who reads
  // slowly had no way to slow the sequence down.
  await resetApp(page);
  await completeFirstRun(page);
  await selectGoals(page, [...DAILY_GOALS]);

  // Tap through stages 1 and 2 as soon as the affordance unlocks.
  await page.goto("/goals");
  await page.getByTestId(`goal-item-${DAILY_GOALS[0]}`).click();
  await page.getByTestId("goal-confirm-yes").click();
  const advance = page.getByTestId("reward-advance");
  await expect(advance).toBeVisible();
  await expect(advance).toHaveAttribute("data-ready", "true", { timeout: 5000 });
  await advance.click();
  await expect(page.getByTestId("reward-stage-energy")).toBeVisible();
  await expect(advance).toHaveAttribute("data-ready", "true", { timeout: 5000 });
  await advance.click();
  await expect(page.getByTestId("reward-stage-change")).toBeVisible();

  // Tapping is not skipping: the beat still played, so stages_seen reaches 3.
  await page.getByTestId("reward-skip").click();
  await page.getByTestId("reward-continue").click();
  await page.goto("/debug/export");
  const parsed = JSON.parse((await page.getByTestId("export-json").textContent()) ?? "");
  const reward = parsed.events.find(
    (e: { name: string }) => e.name === "reward_viewed",
  ).props;
  expect(reward.stages_seen).toBe(3);
  expect(reward.skipped).toBe(true);
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
 * The ending promised on Day 6 must land for a child who did *less*, not only
 * for one on three goals a day (P5: doing less is never punished).
 *
 * Regression: the gate opened only at 180 total energy — six perfect days —
 * because the pet and plant ladders happen to top out there. A child completing
 * one goal a day reached Day 7, completed a goal, and got nothing: the mystery
 * gate stayed shut forever while the home screen said the 7-day journey was
 * complete.
 */
test("低完成度也能在 Day 7 得到结局（每天 1 个目标）", async ({ page }) => {
  await resetApp(page);
  await completeFirstRun(page);

  // The state a one-goal-a-day child arrives on Day 7 with: 10 energy earned on
  // Day 1 and a 50 debug delta = 60 total, deliberately well under the 180 the
  // old gate demanded. Written straight into the persisted snapshot so the test
  // does not replay six days; the assertion is about the domain rule, not about
  // how the state was reached.
  await selectGoals(page, [DAILY_GOALS[0]]);
  await completeGoal(page, DAILY_GOALS[0]);
  await writePersistedState(page, { debugEnergyDelta: 50, dayOverride: 7 });
  await page.goto("/?debug=1");
  await expect(page.getByTestId("debug-day-value")).toHaveText("Day 7");
  await page.goto("/");

  // The door is still shut before today's action, and the pet is honestly only
  // as grown as 60 energy allowed.
  await expect(page.getByTestId("pet-sprite")).toHaveAttribute("data-pet-state", "baby");
  await expect(page.getByTestId("new-area")).toHaveCount(0);

  // One goal on the final day is all the ending requires. The reward copy for
  // the gate opening is asserted in the domain tests; what this test owns is the
  // end-to-end promise: the door a Day 6 child was told to come back for is
  // actually open for a child who did less.
  await selectGoals(page, [DAILY_GOALS[1]]);
  await page.getByTestId(`goal-item-${DAILY_GOALS[1]}`).click();
  await page.getByTestId("goal-confirm-yes").click();

  await expect(page.getByTestId("reward-overlay")).toBeVisible();
  // Let stage 3 play rather than skipping: this is the beat the whole week was
  // built toward, and the child must actually see the door open.
  await expect(page.getByTestId("reward-change-title")).toContainText(
    "门后的世界打开了",
    { timeout: 15000 },
  );
  await skipRewardToNext(page);
  await page.getByTestId("reward-continue").click();

  // The finale sequence plays, and its "继续我的成长" button records the same
  // demand signal a perfect student produces — the low-completion child is not
  // quietly excluded from the experiment's most important metric.
  await expect(page.getByTestId("finale-overlay")).toBeVisible({ timeout: 15000 });
  await page.getByTestId("finale-continue").click();
  await expect(page.getByTestId("finale-overlay")).toBeHidden();

  // The world really opened, and the pet is still a baby: the child did not grow
  // it, and pretending otherwise would contradict the finale's own line
  // (这一切，都来自你现实里的成长).
  await page.goto("/");
  await expect(page.getByTestId("new-area")).toBeVisible();
  await expect(page.getByTestId("pet-sprite")).toHaveAttribute("data-pet-state", "baby");

  const state = await readPersistedState(page);
  expect(state.continueRequested).toBe(true);
});

/**
 * The world must never flash before the welcome on a cold first visit.
 *
 * Regression: the overlays are lazily-loaded chunks, and the shell used to
 * render the page as soon as hydration finished. On a first run that painted
 * the world for a moment and then covered it with the onboarding overlay.
 */
test("首次访问：世界不会先于欢迎页闪现", async ({ page }) => {
  // Watch the DOM from before the app boots and record whether any real page
  // content ever appeared. The skeleton and the bottom nav are intentionally
  // present from the first paint — the nav is hidden behind the opaque overlay
  // and the skeleton is a placeholder — so only real content counts as a leak.
  // Note `world-scene` is not a usable signal either: the onboarding overlay
  // renders its own WorldScene preview.
  await page.addInitScript(() => {
    (window as unknown as { __leakedApp: string[] }).__leakedApp = [];
    const seen = (window as unknown as { __leakedApp: string[] }).__leakedApp;
    const check = () => {
      for (const [sel, label] of [
        ['[data-testid="day-badge"]', "world-page"],
        ['[data-testid="world-name"]', "world-title"],
        ['[data-testid="today-energy"]', "energy-panel"],
      ] as const) {
        if (document.querySelector(sel) && !seen.includes(label)) seen.push(label);
      }
    };
    document.addEventListener("DOMContentLoaded", () => {
      check();
      new MutationObserver(check).observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    });
  });

  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  const overlay = page.getByTestId("first-run-overlay");
  await expect(overlay).toBeVisible();
  // Give any late paint a chance to land before asserting.
  await page.waitForTimeout(400);

  const leaked = await page.evaluate(
    () => (window as unknown as { __leakedApp: string[] }).__leakedApp,
  );
  expect(leaked).toEqual([]);

  // And the app does appear once onboarding is done.
  await completeFirstRun(page);
  await page.goto("/");
  await expect(page.getByTestId("world-scene")).toBeVisible();
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
    // Each entry is centred inside its own quarter of the bar.
    const cellCentre = navBox!.x + (i + 0.5) * cellWidth;
    expect(Math.abs(box!.x + box!.width / 2 - cellCentre)).toBeLessThan(2);
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

/** The selected entry must be visibly highlighted, not just recoloured text. */
test("底部导航：选中项有明显高亮", async ({ page }) => {
  await resetApp(page);
  await completeFirstRun(page);

  const transparent = "rgba(0, 0, 0, 0)";

  for (const [path, activeId, otherIds] of [
    ["/plant", "nav-plant", ["nav-world", "nav-goals", "nav-pet"]],
    ["/goals", "nav-goals", ["nav-world", "nav-pet", "nav-plant"]],
  ] as const) {
    await page.goto(path);

    // Exactly one entry reports itself active.
    await expect(page.getByTestId(activeId)).toHaveAttribute("data-active", "true");
    for (const id of otherIds) {
      await expect(page.getByTestId(id)).toHaveAttribute("data-active", "false");
    }

    // The active entry paints a visible pill behind it; the others do not.
    const activePill = await page
      .getByTestId(`${activeId}-pill`)
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(activePill).not.toBe(transparent);

    const inactivePill = await page
      .getByTestId(`${otherIds[0]}-pill`)
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(inactivePill).toBe(transparent);

    // And its label is tinted differently from an inactive one.
    const activeColour = await page
      .getByTestId(activeId)
      .evaluate((el) => getComputedStyle(el).color);
    const inactiveColour = await page
      .getByTestId(otherIds[0])
      .evaluate((el) => getComputedStyle(el).color);
    expect(activeColour).not.toBe(inactiveColour);
  }
});

/**
 * The nav must stay pinned to the bottom of the viewport on long pages.
 *
 * Regression: .app-frame used `min-height`, so it grew with the content and the
 * BODY scrolled. On /history the nav ended up ~930px down an 844px viewport —
 * only reachable after scrolling to the very end of the page.
 */
test("底部导航：长页面滚动时始终固定在底部", async ({ page }) => {
  await resetApp(page);
  await completeFirstRun(page);

  // Day 7 with every goal completed gives /history and /plant plenty to scroll.
  await page.goto("/?debug=1");
  for (let i = 0; i < 6; i += 1) {
    await page.getByTestId("debug-day-plus").click();
  }

  for (const path of ["/history", "/plant"]) {
    await page.goto(path);
    await expect(page.locator("nav")).toBeVisible();

    const pageContent = page.locator('[data-testid$="-page"]');
    const scrollable = await pageContent.evaluate(
      (el) => el.scrollHeight > el.clientHeight + 4,
    );
    // The page itself must scroll internally, not the document.
    const bodyScrolls = await page.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight + 2,
    );
    expect(bodyScrolls).toBe(false);

    if (scrollable) {
      await pageContent.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
    }

    const navBox = await page.locator("nav").boundingBox();
    const viewport = page.viewportSize();
    expect(navBox).not.toBeNull();
    // Pinned: flush with the bottom of the viewport, before and after scrolling.
    expect(Math.abs(navBox!.y + navBox!.height - viewport!.height)).toBeLessThan(2);
  }
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
