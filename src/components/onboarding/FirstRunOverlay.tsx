"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DEFAULT_WORLD_NAME } from "@/domain/constants";
import type { PetSpecies } from "@/domain/types";
import { usePrototypeStore } from "@/store/prototype-store";

const SPECIES: Array<{ id: PetSpecies; emoji: string; label: string; ready: boolean }> = [
  { id: "fox", emoji: "🦊", label: "小狐狸", ready: true },
  { id: "cat", emoji: "🐱", label: "小猫", ready: false },
  { id: "rabbit", emoji: "🐰", label: "小兔", ready: false },
];

/**
 * First run flow (spec section 12).
 *
 * Deliberately an overlay rather than extra routes, so the world is always the
 * first real screen the student lands on.
 */
export function FirstRunOverlay() {
  const router = useRouter();
  const completeFirstRun = usePrototypeStore((s) => s.completeFirstRun);

  const [step, setStep] = useState(0);
  const [species, setSpecies] = useState<PetSpecies>("fox");
  const [worldName, setWorldName] = useState(DEFAULT_WORLD_NAME);

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-gradient-to-b from-[#eef8ff] to-[#fdf6ea]"
      data-testid="first-run-overlay"
      data-step={step}
      role="dialog"
      aria-modal="true"
      aria-label="开始你的成长世界"
    >
      <AnimatePresence mode="wait">
        {step === 0 ? (
          <Panel key="welcome">
            <div className="text-[56px]" aria-hidden>
              🌱
            </div>
            <h1 className="mt-6 text-[22px] font-bold text-ink">欢迎来到你的成长世界</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
              现实里的每一次成长
              <br />
              都会让这里发生一点变化。
            </p>
            <button
              type="button"
              data-testid="first-run-create"
              onClick={() => setStep(1)}
              className="cta mt-10 w-full bg-leaf-deep px-5 text-[15px] font-semibold text-white"
            >
              创建我的世界
            </button>
          </Panel>
        ) : null}

        {step === 1 ? (
          <Panel key="species">
            <h1 className="text-[20px] font-bold text-ink">你想和谁一起成长？</h1>
            <div className="mt-7 grid w-full grid-cols-3 gap-3">
              {SPECIES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={!s.ready}
                  data-testid={`species-${s.id}`}
                  onClick={() => s.ready && setSpecies(s.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-card border px-2 py-4 transition ${
                    species === s.id && s.ready
                      ? "border-leaf-deep bg-leaf/15"
                      : "border-sand bg-white/70"
                  } ${s.ready ? "" : "opacity-55"}`}
                >
                  <span className="text-[34px]" aria-hidden>
                    {s.emoji}
                  </span>
                  <span className="text-[12px] font-semibold text-ink-soft">
                    {s.label}
                  </span>
                  {!s.ready ? (
                    <span className="text-[10px] text-ink-faint">很快来到</span>
                  ) : null}
                </button>
              ))}
            </div>
            <button
              type="button"
              data-testid="first-run-species-next"
              onClick={() => setStep(2)}
              className="cta mt-8 w-full bg-leaf-deep px-5 text-[15px] font-semibold text-white"
            >
              就选它了
            </button>
          </Panel>
        ) : null}

        {step === 2 ? (
          <Panel key="name">
            <div className="text-[44px]" aria-hidden>
              🏝️
            </div>
            <h1 className="mt-5 text-[20px] font-bold text-ink">给你的世界起个名字</h1>
            <input
              value={worldName}
              onChange={(e) => setWorldName(e.target.value)}
              maxLength={12}
              aria-label="世界名字"
              data-testid="first-run-world-name"
              className="mt-6 w-full rounded-button border border-sand bg-white px-4 py-3 text-center text-[16px] text-ink outline-none focus:border-leaf"
            />
            <button
              type="button"
              data-testid="first-run-start"
              disabled={worldName.trim().length === 0}
              onClick={() => {
                completeFirstRun({ worldName, petSpecies: species });
                router.push("/goals");
              }}
              className={`cta mt-6 w-full px-5 text-[15px] font-semibold text-white ${
                worldName.trim().length === 0 ? "bg-ink-faint/40" : "bg-leaf-deep"
              }`}
            >
              开始
            </button>
          </Panel>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28 }}
      className="flex flex-1 flex-col items-center justify-center px-8 text-center"
    >
      {children}
    </motion.div>
  );
}
