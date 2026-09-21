import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

import { setActiveAgeBand } from "@/analytics/properties";

/**
 * jsdom in this project is only used to provide `localStorage` for the store
 * tests, so the setup file stays deliberately small.
 */
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

/**
 * The age band lives in module state (it has to: `commonProps()` is called from
 * both the local log and the wire). Reset it between tests so a band set in one
 * test cannot leak into the next one's wire-format assertions.
 */
beforeEach(() => {
  setActiveAgeBand(null);
});
