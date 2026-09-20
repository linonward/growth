"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { IconLock, IconSparkle } from "@/components/ui/icons";
import { PetBadge } from "@/components/world/sprites/PetSprite";
import { WorldScene } from "@/components/world/WorldScene";
import { DEFAULT_WORLD_NAME } from "@/domain/constants";
import type { PetSpecies } from "@/domain/types";
import { getWorldState } from "@/domain/world";
import { usePrototypeStore } from "@/store/prototype-store";

const SPECIES: Array<{ id: PetSpecies; label: string; ready: boolean }> = [
  { id: "fox", label: "小狐狸", ready: true },
  { id: "cat", label: "小猫", ready: false },
  { id: "rabbit", label: "小兔", ready: false },
];

/** Day 1, no energy: exactly the world the student is about to inherit. */
const EMPTY_WORLD = getWorldState(1, 0);

/**
 * First run flow (spec section 12).
 *
 * Deliberately an overlay rather than extra routes, so the world is always the
 * first real screen the student lands on.
 *
 * Step 1 shows the actual world art rather than an illustration of it — the
 * promise ("现实里的成长会让这里变化") lands harder when you can already see the
 * empty island it is talking about.
 */
export function FirstRunOverlay() {
  const router = useRouter();
  const completeFirstRun = usePrototypeStore((s) => s.completeFirstRun);

  const [step, setStep] = useState(0);
  const [species, setSpecies] = useState<PetSpecies>("fox");
  const [worldName, setWorldName] = useState(DEFAULT_WORLD_NAME);

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-gradient-to-b from-[#eaf6ff] via-[#fdf6ea] to-[#f6efe1]"
      data-testid="first-run-overlay"
      data-step={step}
      role="dialog"
      aria-modal="true"
      aria-label="开始你的成长世界"
    >
      <AnimatePresence mode="wait">
        {step === 0 ? (
          <Panel key="welcome">
            <div className="w-full overflow-hidden rounded-[26px] border border-sand-deep/40 bg-white/50 shadow-soft">
              <WorldScene
                day={1}
                petState="egg"
                plantState="seed"
                worldState={EMPTY_WORLD}
                cloudCount={0}
                className="block w-full"
              />
            </div>

            <h1 className="t-display mt-8 text-ink">欢迎来到你的成长世界</h1>
            <p className="t-body mt-3 text-ink-soft">
              现实里的每一次成长
              <br />
              都会让这里发生一点变化。
            </p>

            <div className="mt-7 flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-[12px] font-semibold text-ink-soft shadow-soft">
              <IconSparkle size={15} className="text-growth" />7 天 · 每天最多 3 个小目标
            </div>

            <button
              type="button"
              data-testid="first-run-create"
              onClick={() => setStep(1)}
              className="cta btn-primary mt-7 w-full px-5"
            >
              创建我的世界
            </button>
          </Panel>
        ) : null}

        {step === 1 ? (
          <Panel key="species">
            <h1 className="t-title text-ink">你想和谁一起成长？</h1>
            <p className="t-caption mt-2">它会在第 3 天出生</p>

            <div className="mt-8 grid w-full grid-cols-3 gap-3">
              {SPECIES.map((s) => {
                const selected = species === s.id && s.ready;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!s.ready}
                    data-testid={`species-${s.id}`}
                    onClick={() => s.ready && setSpecies(s.id)}
                    className={`flex flex-col items-center gap-2 rounded-card px-2 pt-3 pb-4 transition ${
                      selected
                        ? "border border-leaf-deep/45 bg-leaf-wash shadow-soft"
                        : "card"
                    } ${s.ready ? "" : "opacity-70"}`}
                  >
                    {s.ready ? (
                      <PetBadge state="baby" size={78} />
                    ) : (
                      <span className="chip h-[78px] w-[78px] bg-sand/60 text-ink-faint">
                        <IconLock size={22} />
                      </span>
                    )}
                    <span className="text-[12px] font-semibold text-ink">{s.label}</span>
                    {!s.ready ? (
                      <span className="text-[10px] text-ink-faint">很快来到</span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              data-testid="first-run-species-next"
              onClick={() => setStep(2)}
              className="cta btn-primary mt-9 w-full px-5"
            >
              就选它了
            </button>
          </Panel>
        ) : null}

        {step === 2 ? (
          <Panel key="name">
            <span className="chip h-16 w-16 bg-leaf-wash text-leaf-deep" aria-hidden>
              <IconSparkle size={28} />
            </span>
            <h1 className="t-title mt-6 text-ink">给你的世界起个名字</h1>
            <input
              value={worldName}
              onChange={(e) => setWorldName(e.target.value)}
              maxLength={12}
              aria-label="世界名字"
              data-testid="first-run-world-name"
              className="mt-7 w-full rounded-button border border-sand-deep/50 bg-white px-4 py-3.5 text-center text-[16px] text-ink shadow-soft outline-none focus:border-leaf"
            />
            <button
              type="button"
              data-testid="first-run-start"
              disabled={worldName.trim().length === 0}
              onClick={() => {
                completeFirstRun({ worldName, petSpecies: species });
                router.push("/goals");
              }}
              className="cta btn-primary mt-6 w-full px-5"
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
      className="flex flex-1 flex-col items-center justify-center px-7 text-center"
    >
      {children}
    </motion.div>
  );
}
