import { expect, type Page } from "@playwright/test";

/** localStorage key used by the persisted prototype store. */
export const STORAGE_KEY = "growth-world-prototype-v1";

/** Start from a completely fresh prototype. */
export async function resetApp(page: Page) {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
}

/** Complete the first-run overlay and land on the goal picker. */
export async function completeFirstRun(page: Page, worldName = "小光岛") {
  await expect(page.getByTestId("first-run-overlay")).toBeVisible();
  await page.getByTestId("first-run-create").click();
  await page.getByTestId("species-fox").click();
  await page.getByTestId("first-run-species-next").click();
  await page.getByTestId("first-run-world-name").fill(worldName);
  await page.getByTestId("first-run-start").click();
  await expect(page.getByTestId("goal-picker")).toBeVisible();
}

/** Pick goals for the current day and enter the task state. */
export async function selectGoals(page: Page, templateIds: string[]) {
  await page.goto("/goals");
  await expect(page.getByTestId("goal-picker")).toBeVisible();
  for (const id of templateIds) {
    await page.getByTestId(`goal-option-${id}`).click();
  }
  await page.getByTestId("goal-start").click();
  await expect(page.getByTestId("goals-tasks")).toBeVisible();
}

/** The three goals used throughout the happy path. */
export const DAILY_GOALS = ["math", "chinese", "english"] as const;

/**
 * Complete one goal through the whole confirmation + reward flow.
 *
 * The reward overlay blocks the page, so it always has to be walked to its last
 * stage before the next interaction. Dismissing it returns to the world screen
 * (spec section 3), so we navigate back to /goals to stay on the task list.
 */
export async function completeGoal(
  page: Page,
  templateId: string,
  options: { initiative?: "self" | "prompted" } = {},
) {
  await page.goto("/goals");
  await page.getByTestId(`goal-item-${templateId}`).click();
  await expect(page.getByTestId("goal-confirm-dialog")).toBeVisible();
  await page.getByTestId("goal-confirm-yes").click();

  await expect(page.getByTestId("reward-overlay")).toBeVisible();
  await skipRewardToNext(page);

  if (options.initiative) {
    const button = page.getByTestId(`initiative-${options.initiative}`);
    if (await button.isVisible().catch(() => false)) {
      await button.click();
    }
  }

  await page.getByTestId("reward-continue").click();
  await expect(page.getByTestId("reward-overlay")).toBeHidden();
  // The real "回到我的世界" button lands on the world screen; come back to the
  // task list so callers can keep completing goals.
  await page.goto("/goals");
}

/** Jump the reward sequence straight to its final stage. */
export async function skipRewardToNext(page: Page) {
  const skip = page.getByTestId("reward-skip");
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
  }
  await expect(page.getByTestId("reward-stage-next")).toBeVisible();
}

/** Move the debug day control to a specific day. */
export async function gotoDay(page: Page, day: number) {
  await page.goto("/?debug=1");
  await expect(page.getByTestId("debug-panel")).toBeVisible();

  for (let i = 0; i < 12; i += 1) {
    const label = (await page.getByTestId("debug-day-value").textContent()) ?? "";
    const current = Number.parseInt(label.replace(/\D/g, ""), 10);
    if (current === day) return;
    await page.getByTestId(current < day ? "debug-day-plus" : "debug-day-minus").click();
  }
  throw new Error(`Could not reach Day ${day}`);
}

/** Complete a full day of three goals, starting from the home screen. */
export async function completeFullDay(
  page: Page,
  options: { initiative?: "self" | "prompted" } = {},
) {
  await page.goto("/goals");
  await selectGoals(page, [...DAILY_GOALS]);
  for (let i = 0; i < DAILY_GOALS.length; i += 1) {
    await completeGoal(page, DAILY_GOALS[i], i === 0 ? options : {});
  }
}

/** Read the persisted store snapshot straight out of localStorage. */
export async function readPersistedState(page: Page) {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw).state : null;
  }, STORAGE_KEY);
}

/**
 * Merge a partial state into the persisted snapshot.
 *
 * For tests that need a specific *starting* state — e.g. the energy a
 * one-goal-a-day child would have on Day 7 — without replaying six days through
 * the UI. The stored `version` is preserved so the store's migration path stays
 * exercised.
 */
export async function writePersistedState(
  page: Page,
  patch: Record<string, unknown>,
): Promise<void> {
  await page.evaluate(
    ({ key, next }) => {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : { state: {}, version: 1 };
      window.localStorage.setItem(
        key,
        JSON.stringify({ ...parsed, state: { ...parsed.state, ...next } }),
      );
    },
    { key: STORAGE_KEY, next: patch },
  );
}
