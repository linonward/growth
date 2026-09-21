"use client";

import { IconSparkle } from "@/components/ui/icons";
import { IconChip } from "@/components/ui/primitives";
import type { InitiativeAnswer } from "@/domain/types";
import { usePrototypeStore } from "@/store/prototype-store";

/**
 * The self-initiated action question (spec section 15).
 *
 * SAAR is the North Star, so this prompt *is* the measurement. Two things had
 * to change before the number could be interpreted:
 *
 * 1. **The prompt used to show the answer.** `我自己想起来的` was a green button
 *    and `有人提醒我的` a grey one, and the wording compared the two ("有人提醒
 *    我的" reads as an admission). A child — especially a six-year-old — answers
 *    the question they think the adult wants. Both options are now the same
 *    weight and colour, and both are phrased as plain statements of fact.
 *
 * 2. **Not answering is now a recorded answer.** Previously the prompt stayed
 *    pending and re-appeared on the home screen day after day, which both nags
 *    the child and leaves SAAR computed only over the children who did answer —
 *    the group least likely to have been prompted. `先不回答` is now offered
 *    once, recorded as `unanswered`, and never asked again that day.
 *
 * The helper line matters for the younger half of 6–12: "reminded" and "someone
 * else opened it for me" are the same event to a six-year-old, and the
 * difference is the entire point of the metric. The prompt itself is asked at
 * most once per day; Day 4 in particular must keep it.
 */
export function InitiativePrompt({ day }: { day: number }) {
  const answerInitiative = usePrototypeStore((s) => s.answerInitiative);
  const pendingDay = usePrototypeStore((s) => s.pendingInitiativeDay);

  if (pendingDay !== day) return null;

  const answer = (value: InitiativeAnswer) => () => answerInitiative(day, value);

  return (
    <div className="card px-4 py-4" data-testid="initiative-prompt">
      <div className="flex items-start gap-3">
        <IconChip tint="sand" size={36}>
          <IconSparkle size={17} />
        </IconChip>
        <div className="min-w-0 flex-1">
          <p className="t-headline text-ink">今天是怎么打开这个世界？</p>
          {/*
            Neutrally worded on purpose: it is a definition, not a hint about
            which answer is the right one. It also disambiguates the two options
            for a child who cannot yet tell "reminded" from "opened for me".
          */}
          <p className="t-caption mt-1 text-[12px]">
            自己打开，和有人叫你来，两种都可以。
          </p>
        </div>
      </div>

      {/*
        Identical classes on both options — same border, same background, same
        text weight and colour. Any asymmetry here is read as "the answer".
      */}
      <div className="mt-3.5 flex gap-2.5">
        <button
          type="button"
          onClick={answer("self")}
          data-testid="initiative-self"
          className="tap-target flex-1 rounded-button border border-sand-deep/45 bg-white px-3 py-2.5 text-[13px] font-medium text-ink-soft"
        >
          我自己打开的
        </button>
        <button
          type="button"
          onClick={answer("prompted")}
          data-testid="initiative-prompted"
          className="tap-target flex-1 rounded-button border border-sand-deep/45 bg-white px-3 py-2.5 text-[13px] font-medium text-ink-soft"
        >
          有人叫我来
        </button>
      </div>

      {/*
        A real third outcome rather than a hidden escape: without it the child
        either guesses or the card stays on the home screen all day. Low-key
        styling is right here — it should be available, not inviting.
      */}
      <button
        type="button"
        onClick={answer("unanswered")}
        data-testid="initiative-skip"
        className="tap-target mt-2 w-full rounded-button px-3 py-2 text-[12px] text-ink-faint"
      >
        先不回答
      </button>
    </div>
  );
}
