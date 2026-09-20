"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { InitiativePrompt } from "@/components/onboarding/InitiativePrompt";
import { IconSparkle, IconWorldDrop } from "@/components/ui/icons";
import { EmojiChip, ProgressBar } from "@/components/ui/primitives";
import { getGoalTemplate } from "@/data/goals";
import { MAX_ENERGY_PER_DAY } from "@/domain/constants";
import type { RewardMoment, RewardStage } from "@/domain/types";
import { useMilestone, useTodayEnergy } from "@/store/hooks";
import { usePrototypeStore } from "@/store/prototype-store";

/** Spec section 5 timings. Major moments linger, but never past 2.5s. */
const CONFIRM_MS = 900;
const ENERGY_MS = 900;
const CHANGE_MS = 1700;
const MAJOR_CHANGE_MS = 2500;

/**
 * The full-screen completion feedback.
 *
 * Spec section 5 is explicit that this must not be a "+10" toast: the student
 * has to see behaviour -> world change. Four stages, always skippable.
 *
 * Keyed by goal id so each completion replays the sequence from stage 1.
 */
export function RewardOverlay() {
  const reward = usePrototypeStore((s) => s.activeReward);

  return (
    <AnimatePresence>
      {reward ? <RewardSequence key={reward.goalId} reward={reward} /> : null}
    </AnimatePresence>
  );
}

function RewardSequence({ reward }: { reward: RewardMoment }) {
  const router = useRouter();
  const dismissReward = usePrototypeStore((s) => s.dismissReward);
  const logEvent = usePrototypeStore((s) => s.logEvent);
  const markMilestoneSeen = usePrototypeStore((s) => s.markMilestoneSeen);
  const todayEnergy = useTodayEnergy();
  const milestone = useMilestone();

  const [stage, setStage] = useState<RewardStage>("confirm");

  // Record that the feedback was actually shown, for the analytics export.
  useEffect(() => {
    logEvent("reward_viewed", {
      goalId: reward.goalId,
      isMajor: reward.change.isMajor,
      target: reward.change.target,
    });
    if (reward.milestone) markMilestoneSeen(reward.milestone.id);
  }, [reward, logEvent, markMilestoneSeen]);

  useEffect(() => {
    if (stage === "confirm") {
      const t = setTimeout(() => setStage("energy"), CONFIRM_MS);
      return () => clearTimeout(t);
    }
    if (stage === "energy") {
      const t = setTimeout(() => setStage("change"), ENERGY_MS);
      return () => clearTimeout(t);
    }
    if (stage === "change") {
      const t = setTimeout(
        () => setStage("next"),
        reward.change.isMajor ? MAJOR_CHANGE_MS : CHANGE_MS,
      );
      return () => clearTimeout(t);
    }
    return undefined;
  }, [stage, reward.change.isMajor]);

  const template = getGoalTemplate(reward.templateId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24 }}
      className="absolute inset-0 z-40 flex flex-col bg-gradient-to-b from-[#fdf6ea]/97 to-[#eef6ec]/97 backdrop-blur-[2px]"
      data-testid="reward-overlay"
      data-stage={stage}
      role="dialog"
      aria-modal="true"
      aria-label="完成反馈"
    >
      <div className="flex justify-end p-3">
        {stage !== "next" ? (
          <button
            type="button"
            onClick={() => setStage("next")}
            data-testid="reward-skip"
            className="tap-target rounded-full px-3 text-[13px] text-ink-faint"
          >
            跳过
          </button>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-7 text-center">
        {stage === "confirm" ? (
          <StageConfirm emoji={template?.emoji ?? "✨"} title={template?.title ?? ""} />
        ) : null}

        {stage === "energy" ? <StageEnergy /> : null}

        {stage === "change" ? (
          <StageChange
            from={reward.change.from}
            to={reward.change.to}
            title={reward.change.title}
            detail={reward.change.detail}
            major={reward.change.isMajor}
          />
        ) : null}

        {stage === "next" ? (
          <StageNext
            todayEnergy={todayEnergy}
            title={milestone.title}
            detail={milestone.detail}
            day={reward.day}
          />
        ) : null}
      </div>

      {stage === "next" ? (
        <div className="space-y-2.5 px-6 pb-8">
          <InitiativePrompt day={reward.day} />
          <button
            type="button"
            data-testid="reward-continue"
            onClick={() => {
              dismissReward();
              if (!reward.isFinale) router.push("/");
            }}
            className="cta w-full bg-leaf-deep px-5 text-[15px] font-semibold text-white"
          >
            {reward.isFinale ? "看看世界的变化" : "回到我的世界"}
          </button>
        </div>
      ) : null}
    </motion.div>
  );
}

function StageConfirm({ emoji, title }: { emoji: string; title: string }) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      data-testid="reward-stage-confirm"
    >
      <span className="chip mx-auto h-20 w-20 bg-growth-wash text-growth" aria-hidden>
        <IconSparkle size={40} />
      </span>
      <p className="t-display mt-4 text-ink">今天做到了！</p>
      <div className="mt-3 flex items-center justify-center gap-2.5">
        <EmojiChip tint="sand" size={34}>
          {emoji}
        </EmojiChip>
        <span className="t-headline text-ink-soft">{title}</span>
      </div>
      <p className="t-headline mt-5 text-growth">+10 成长能量</p>
    </motion.div>
  );
}

/** Stage 2: energy particles travelling into the world (spec section 22). */
function StageEnergy() {
  return (
    <div data-testid="reward-stage-energy" className="relative">
      <p className="t-title text-growth">+10 成长能量</p>
      <div className="relative mx-auto mt-6 h-40 w-40">
        <div className="absolute inset-x-0 bottom-0 flex justify-center">
          {Array.from({ length: 7 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute block rounded-full bg-growth"
              style={{
                width: 7,
                height: 7,
                left: `${18 + i * 10}%`,
                boxShadow: "0 0 10px 3px rgba(240,180,92,0.55)",
              }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: -110, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.85, delay: i * 0.06, ease: "easeOut" }}
            />
          ))}
        </div>
        <motion.div
          className="absolute inset-x-0 bottom-0 flex justify-center text-leaf-deep"
          initial={{ scale: 0.8 }}
          animate={{ scale: [0.8, 1.1, 1] }}
          transition={{ duration: 0.9 }}
          aria-hidden
        >
          <IconWorldDrop size={54} />
        </motion.div>
      </div>
    </div>
  );
}

/** Stage 3: the actual world change. */
function StageChange({
  from,
  to,
  title,
  detail,
  major,
}: {
  from: string;
  to: string;
  title: string;
  detail: string;
  major: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid="reward-stage-change"
    >
      <div className="flex items-center justify-center gap-4">
        <motion.span
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.45 }}
          aria-hidden
        >
          <EmojiChip tint="sand" size={64}>
            {from}
          </EmojiChip>
        </motion.span>
        <motion.span
          className="text-ink-faint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          aria-hidden
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12h15M13 6l6 6-6 6" />
          </svg>
        </motion.span>
        <motion.span
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: major ? [0.6, 1.25, 1] : 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          aria-hidden
        >
          <EmojiChip tint={major ? "growth" : "leaf"} size={64}>
            {to}
          </EmojiChip>
        </motion.span>
      </div>
      <p
        className={`mt-5 font-bold text-ink ${major ? "text-[21px]" : "text-[18px]"}`}
        data-testid="reward-change-title"
      >
        {title}
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{detail}</p>
      {major ? (
        <p className="mt-3 text-[13px] font-semibold text-leaf-deep">
          这是一个特别的时刻
        </p>
      ) : null}
    </motion.div>
  );
}

/** Stage 4: today's progress plus the next thing to look forward to. */
function StageNext({
  todayEnergy,
  title,
  detail,
  day,
}: {
  todayEnergy: number;
  title: string;
  detail: string;
  day: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
      data-testid="reward-stage-next"
    >
      <p className="text-[15px] font-semibold text-ink">今日成长</p>
      <p className="mt-1 text-[30px] font-bold tabular-nums text-ink">
        {todayEnergy}
        <span className="text-[16px] font-normal text-ink-faint">
          {" "}
          / {MAX_ENERGY_PER_DAY}
        </span>
      </p>
      <div className="mt-3">
        <ProgressBar value={todayEnergy} max={MAX_ENERGY_PER_DAY} label="今日成长能量" />
      </div>

      <div className="mt-6 rounded-card bg-white/80 px-4 py-3.5 text-left">
        <p className="text-[14px] font-semibold text-ink" data-testid="reward-next-title">
          {title}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{detail}</p>
      </div>

      <p className="mt-4 text-[12px] text-ink-faint">
        Day {day} · 一起成长的第 {day} 天
      </p>
    </motion.div>
  );
}
