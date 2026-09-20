import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The HTTP transport, exercised with a mocked fetch.
 *
 * These guard the context properties that a SDK would normally add for us —
 * and, more importantly, guard the privacy claim that only the path is ever
 * sent, never the query string.
 */

let fetchMock: ReturnType<typeof vi.fn>;

async function loadClient() {
  vi.resetModules();
  process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
  return import("@/analytics/client");
}

beforeEach(() => {
  fetchMock = vi.fn(() => Promise.resolve({ status: 200 } as Response));
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  window.history.replaceState({}, "", "/");
});

/** Parse the JSON body of the last POST made. */
function lastBody() {
  const call = fetchMock.mock.calls.at(-1);
  return JSON.parse(call?.[1]?.body as string);
}

describe("event context properties", () => {
  it("attaches $lib so PostHog recognises these as web events", async () => {
    const { initAnalytics, send, flushAnalytics } = await loadClient();
    await initAnalytics();
    send("world_viewed", { experiment_day: 1 });
    flushAnalytics();

    const props = lastBody().batch[0].properties;
    expect(props.$lib).toBe("web");
    expect(props.$lib_version).toBeTruthy();
  });

  it("attaches a URL so the Screen column is populated", async () => {
    window.history.replaceState({}, "", "/pet");
    const { initAnalytics, send, flushAnalytics } = await loadClient();
    await initAnalytics();
    send("pet_viewed", { experiment_day: 3 });
    flushAnalytics();

    const props = lastBody().batch[0].properties;
    expect(props.$pathname).toBe("/pet");
    expect(props.$current_url).toBe(`${window.location.origin}/pet`);
  });

  it("never sends the query string or hash", async () => {
    window.history.replaceState({}, "", "/goals?debug=1&participant=secret#frag");
    const { initAnalytics, send, flushAnalytics } = await loadClient();
    await initAnalytics();
    send("world_viewed", { experiment_day: 1 });
    flushAnalytics();

    const url = lastBody().batch[0].properties.$current_url as string;
    expect(url).toBe(`${window.location.origin}/goals`);
    for (const leak of ["debug", "participant", "secret", "?", "#"]) {
      expect(url).not.toContain(leak);
    }
  });

  it("attaches the context to $identify as well", async () => {
    window.history.replaceState({}, "", "/history");
    const { initAnalytics } = await loadClient();
    await initAnalytics();
    expect(lastBody().event).toBe("$identify");
    expect(lastBody().properties.$pathname).toBe("/history");
  });

  it("$identify carries the anonymous id and only experiment_version in $set", async () => {
    const { initAnalytics } = await loadClient();
    await initAnalytics();
    const body = lastBody();
    expect(body.distinct_id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(Object.keys(body.properties.$set)).toEqual(["experiment_version"]);
  });
});

describe("delivery", () => {
  it("batches queued events into one request", async () => {
    const { initAnalytics, send, flushAnalytics } = await loadClient();
    await initAnalytics();
    const before = fetchMock.mock.calls.length;
    send("world_viewed", {});
    send("goal_selected", {});
    send("goal_completed", {});
    flushAnalytics();

    const calls = fetchMock.mock.calls.slice(before);
    expect(calls).toHaveLength(1);
    expect(lastBody().batch.map((e: { event: string }) => e.event)).toEqual([
      "world_viewed",
      "goal_selected",
      "goal_completed",
    ]);
  });

  it("posts through the same-origin proxy, never to posthog.com", async () => {
    const { initAnalytics, send, flushAnalytics } = await loadClient();
    await initAnalytics();
    send("world_viewed", {});
    flushAnalytics();

    for (const call of fetchMock.mock.calls) {
      expect(call[0]).toMatch(/^\/ingest\//);
      expect(call[0]).not.toContain("posthog.com");
    }
  });

  it("is a no-op without an API key", async () => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const { initAnalytics, send, isAnalyticsConfigured } = await import(
      "@/analytics/client"
    );
    expect(isAnalyticsConfigured()).toBe(false);
    expect(await initAnalytics()).toBeNull();
    expect(() => send("world_viewed", {})).not.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
