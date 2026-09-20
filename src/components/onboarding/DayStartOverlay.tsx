"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { getDayNarrative } from "@/data/days";
import { DEFAULT_PET_NAME } from "@/domain/constants";
import { isPetBorn } from "@/domain/pet";
import { useGrowth } from "@/store/hooks";
import { usePrototypeStore } from "@/store/prototype-store";

/**
 * The second-day-onward welcome (spec section 14).
 *
 * Notably this does NOT pop a check-in dialog. It shows the world first, then a
 * gentle line about something having changed overnight, and only then offers a
 * way into today's goals.
 *
 * It also carries the Day 3 naming moment, which spec section 11 calls the most
 * important emotional beat of the week.
 */
export function DayStartOverlay() {
  const pendingDay = usePrototypeStore((s) => s.pendingDayStart);
  const dismiss = usePrototypeStore((s) => s.dismissDayStart);
  const worldName = usePrototypeStore((s) => s.profile.worldName);
  const petName = usePrototypeStore((s) => s.profile.petName);
  const hasNamedPet = usePrototypeStore((s) => s.hasNamedPet);
  const renamePet = usePrototypeStore((s) => s.renamePet);
  const growth = useGrowth();

  const [draft, setDraft] = useState(petName);

  const narrative = pendingDay ? getDayNarrative(pendingDay) : null;
  const askingForName = isPetBorn(growth.petState) && !hasNamedPet;

  return (
    <AnimatePresence>
      {pendingDay && narrative ? (
        <motion.div
          key={`day-start-${pendingDay}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gradient-to-b from-[#fdf6ea]/96 to-[#eaf4ff]/96 px-8 text-center backdrop-blur-[2px]"
          data-testid="day-start-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`第 ${pendingDay} 天`}
        >
          <p className="text-[13px] font-semibold tracking-wide text-ink-faint">
            Day {pendingDay}
          </p>
          <h2
            className="mt-3 text-[22px] font-bold text-ink"
            data-testid="day-start-title"
          >
            早上好
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
            昨天之后，
            <br />
            这里好像发生了一点变化……
          </p>

          <div className="mt-8 flex items-center gap-3 text-[38px]">
            <motion.span
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              aria-hidden
            >
              {narrative.emoji}
            </motion.span>
          </div>
          <p className="mt-4 text-[15px] font-semibold text-leaf-deep">
            {narrative.majorCopy}
          </p>

          {askingForName ? (
            <div className="mt-6 w-full" data-testid="day-start-naming">
              <p className="text-[13px] text-ink-soft">给它起个名字吧</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={draft}
                  maxLength={8}
                  aria-label="伙伴名字"
                  data-testid="day-start-pet-name"
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-full rounded-button border border-sand bg-white px-3 py-2 text-center text-[15px] outline-none focus:border-leaf"
                />
                <button
                  type="button"
                  data-testid="day-start-pet-name-save"
                  onClick={() => renamePet(draft || DEFAULT_PET_NAME)}
                  className="tap-target rounded-button bg-leaf-deep px-3 text-[13px] font-semibold text-white"
                >
                  好
                </button>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            data-testid="day-start-cta"
            onClick={dismiss}
            className="cta mt-8 w-full bg-leaf-deep px-5 text-[15px] font-semibold text-white"
          >
            看看今天能发生什么
          </button>
          <p className="mt-3 text-[12px] text-ink-faint">{worldName}</p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
