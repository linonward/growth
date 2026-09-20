"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DAY7_FINALE_LINES } from "@/data/days";
import { usePrototypeStore } from "@/store/prototype-store";

/** The three scripted Day 7 events (spec section 11), in order. */
const EVENTS = [
  {
    id: "plant",
    from: "🌳",
    to: "🌸🌳🌸",
    title: "知识树开花了。",
    detail: "7 天里，它从一颗小小的芽长到了现在。",
  },
  {
    id: "pet",
    from: "🦊",
    to: "🦊✨",
    title: "变成了成长形态。",
    detail: "因为你也一直在成长。",
  },
  {
    id: "world",
    from: "🚪",
    to: "🌈",
    title: "门后的世界打开了。",
    detail: "岛的右边，出现了以前没有的地方。",
  },
] as const;

const EVENT_MS = 2000;
const FINAL_INDEX = EVENTS.length;

/**
 * Day 7's milestone sequence: plant bloom -> pet evolved -> new area.
 *
 * Each beat is short enough to stay under the 2.5s ceiling, and the student can
 * skip straight to the closing message. The inner sequence unmounts whenever the
 * finale ends, so it always restarts from beat 1 without a reset effect.
 */
export function FinaleOverlay() {
  const active = usePrototypeStore((s) => s.activeFinale);

  return (
    <AnimatePresence>
      {active ? <FinaleSequence key="day7-finale" /> : null}
    </AnimatePresence>
  );
}

function FinaleSequence() {
  const router = useRouter();
  const dismissFinale = usePrototypeStore((s) => s.dismissFinale);
  const requestContinue = usePrototypeStore((s) => s.requestContinue);
  const petName = usePrototypeStore((s) => s.profile.petName);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= FINAL_INDEX) return undefined;
    const t = setTimeout(() => setIndex((i) => i + 1), EVENT_MS);
    return () => clearTimeout(t);
  }, [index]);

  const event = index < FINAL_INDEX ? EVENTS[index] : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-[45] flex flex-col items-center justify-center bg-gradient-to-b from-[#fdf3e6]/97 via-[#f6f0ff]/97 to-[#eaf7ff]/97 px-8 text-center backdrop-blur-[2px]"
      data-testid="finale-overlay"
      data-index={index}
      role="dialog"
      aria-modal="true"
      aria-label="第 7 天的变化"
    >
      {event ? (
        <>
          <button
            type="button"
            data-testid="finale-skip"
            onClick={() => setIndex(FINAL_INDEX)}
            className="tap-target absolute top-3 right-3 rounded-full px-3 text-[13px] text-ink-faint"
          >
            跳过
          </button>
          <AnimatePresence mode="wait">
            <motion.div
              key={event.id}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.45 }}
              data-testid={`finale-event-${event.id}`}
            >
              <div className="flex items-center justify-center gap-3 text-[38px]">
                <span aria-hidden>{event.from}</span>
                <span className="text-[20px] text-ink-faint" aria-hidden>
                  →
                </span>
                <span aria-hidden>{event.to}</span>
              </div>
              <p className="mt-7 text-[20px] font-bold text-ink">
                {event.id === "pet" ? `${petName}${event.title}` : event.title}
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
                {event.detail}
              </p>
            </motion.div>
          </AnimatePresence>
          <div className="absolute bottom-10 flex gap-1.5">
            {EVENTS.map((e, i) => (
              <span
                key={e.id}
                className={`h-1.5 w-1.5 rounded-full ${
                  i === index ? "bg-leaf-deep" : "bg-sand"
                }`}
              />
            ))}
          </div>
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-1 flex-col items-center justify-center"
          data-testid="finale-summary"
        >
          <div className="text-[46px]" aria-hidden>
            🌸
          </div>
          <div className="mt-8 space-y-3">
            {DAY7_FINALE_LINES.map((line, i) => (
              <motion.p
                key={line}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.5, duration: 0.45 }}
                className={
                  i === DAY7_FINALE_LINES.length - 1
                    ? "text-[17px] font-semibold text-leaf-deep"
                    : "text-[15px] leading-relaxed text-ink-soft"
                }
              >
                {line}
              </motion.p>
            ))}
          </div>

          <button
            type="button"
            data-testid="finale-continue"
            onClick={() => {
              requestContinue();
              dismissFinale();
              router.push("/history");
            }}
            className="cta mt-12 w-full bg-leaf-deep px-5 text-[15px] font-semibold text-white"
          >
            继续我的成长
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
