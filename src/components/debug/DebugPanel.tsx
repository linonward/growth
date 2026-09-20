"use client";

import { useState, useSyncExternalStore } from "react";

import { MAX_TOTAL_ENERGY } from "@/domain/constants";
import { selectTotalEnergy, usePrototypeStore } from "@/store/prototype-store";

/** The URL does not change during a session, so there is nothing to subscribe to. */
const subscribeToUrl = () => () => {};
const readDebugFlag = () =>
  new URLSearchParams(window.location.search).get("debug") === "1";
/** Server render always hides the panel; the client re-checks after hydration. */
const readDebugFlagOnServer = () => false;

/**
 * Hidden test panel (spec section 18).
 *
 * Waiting a real 7 days to exercise the prototype is impractical, so `?debug=1`
 * exposes day and energy controls. It is never visible in the real experiment.
 */
export function DebugPanel() {
  const enabled = useSyncExternalStore(
    subscribeToUrl,
    readDebugFlag,
    readDebugFlagOnServer,
  );
  const [open, setOpen] = useState(true);

  const day = usePrototypeStore((s) => s.currentDay);
  const totalEnergy = usePrototypeStore(selectTotalEnergy);
  const debugSetDay = usePrototypeStore((s) => s.debugSetDay);
  const debugAdjustEnergy = usePrototypeStore((s) => s.debugAdjustEnergy);
  const debugTriggerReward = usePrototypeStore((s) => s.debugTriggerReward);
  const debugTriggerDay7Event = usePrototypeStore((s) => s.debugTriggerDay7Event);
  const resetPrototype = usePrototypeStore((s) => s.resetPrototype);
  const buildExport = usePrototypeStore((s) => s.buildExport);

  if (!enabled) return null;

  const download = () => {
    const payload = JSON.stringify(buildExport(), null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `growth-experiment-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed bottom-3 left-1/2 z-[60] w-[min(94vw,410px)] -translate-x-1/2"
      data-testid="debug-panel"
    >
      <div className="rounded-card border border-ink/15 bg-ink/92 p-3 text-[12px] text-cream shadow-xl backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Prototype Debug</span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            data-testid="debug-toggle"
            className="tap-target rounded px-2 text-cream/70"
          >
            {open ? "收起" : "展开"}
          </button>
        </div>

        {open ? (
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-cream/70">Current Day</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  data-testid="debug-day-minus"
                  onClick={() => debugSetDay(day - 1)}
                  className="tap-target rounded bg-cream/15 px-2"
                >
                  [-]
                </button>
                <span
                  className="min-w-12 text-center font-semibold"
                  data-testid="debug-day-value"
                >
                  Day {day}
                </span>
                <button
                  type="button"
                  data-testid="debug-day-plus"
                  onClick={() => debugSetDay(day + 1)}
                  className="tap-target rounded bg-cream/15 px-2"
                >
                  [+]
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-cream/70">Energy</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  data-testid="debug-energy-minus"
                  onClick={() => debugAdjustEnergy(-10)}
                  className="tap-target rounded bg-cream/15 px-2"
                >
                  [-10]
                </button>
                <span
                  className="min-w-12 text-center font-semibold"
                  data-testid="debug-energy-value"
                >
                  {totalEnergy} / {MAX_TOTAL_ENERGY}
                </span>
                <button
                  type="button"
                  data-testid="debug-energy-plus"
                  onClick={() => debugAdjustEnergy(10)}
                  className="tap-target rounded bg-cream/15 px-2"
                >
                  [+10]
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <DebugButton testId="debug-trigger-reward" onClick={debugTriggerReward}>
                Trigger Reward
              </DebugButton>
              <DebugButton testId="debug-trigger-day7" onClick={debugTriggerDay7Event}>
                Trigger Day7 Event
              </DebugButton>
              <DebugButton testId="debug-export" onClick={download}>
                Download Data
              </DebugButton>
              <DebugButton testId="debug-reset" onClick={resetPrototype} tone="warn">
                Reset Prototype
              </DebugButton>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DebugButton({
  children,
  onClick,
  testId,
  tone = "normal",
}: {
  children: React.ReactNode;
  onClick: () => void;
  testId: string;
  tone?: "normal" | "warn";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`min-h-11 rounded-button px-2 font-medium ${
        tone === "warn"
          ? "bg-[#c98d6a]/35 text-[#ffd9c4]"
          : "bg-cream/15 text-cream hover:bg-cream/25"
      }`}
    >
      {children}
    </button>
  );
}
