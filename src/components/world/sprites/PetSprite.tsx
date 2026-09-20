"use client";

import { PALETTE as C } from "@/components/world/palette";
import type { PetSpecies, PetState } from "@/domain/types";

interface PetSpriteProps {
  state: PetState;
  species?: PetSpecies;
  /** Anchor point; the sprite's feet rest on this y. */
  x: number;
  y: number;
  /** Rendered name label under the sprite. */
  name?: string;
}

/**
 * The six pet states, drawn as one consistent illustration set.
 *
 * Every state is visually distinct so that Day 1 / Day 3 / Day 7 screenshots
 * are obviously different (acceptance criterion AC4).
 */
export function PetSprite({ state, x, y, name }: PetSpriteProps) {
  return (
    <g transform={`translate(${x} ${y})`} data-testid="pet-sprite" data-pet-state={state}>
      {state === "egg" ? <Egg /> : null}
      {state === "wiggling_egg" ? (
        // Rotation origin comes from the .anim-wiggle class (fill-box, bottom).
        <g className="anim-wiggle">
          <Egg />
        </g>
      ) : null}
      {state === "cracked_egg" ? <CrackedEgg /> : null}
      {state === "baby" ? <Fox scale={0.72} glow={false} /> : null}
      {state === "young" ? <Fox scale={0.92} glow={false} /> : null}
      {state === "evolved" ? <Fox scale={1.06} glow /> : null}
      {name && state !== "egg" && state !== "wiggling_egg" && state !== "cracked_egg" ? (
        <text x={0} y={10} textAnchor="middle" fontSize={11} fill={C.eye} opacity={0.6}>
          {name}
        </text>
      ) : null}
    </g>
  );
}

function Egg() {
  return (
    <g>
      <ellipse cx={0} cy={-4} rx={26} ry={10} fill="#000" opacity={0.07} />
      <path
        d="M0 -56 C 17 -56 27 -34 27 -20 C 27 -6 15 2 0 2 C -15 2 -27 -6 -27 -20 C -27 -34 -17 -56 0 -56 Z"
        fill={C.eggShell}
        stroke={C.eggShade}
        strokeWidth={1.5}
      />
      <ellipse cx={-8} cy={-32} rx={7} ry={10} fill="#fff" opacity={0.55} />
      <circle cx={7} cy={-40} r={3} fill={C.eggSpot} />
      <circle cx={-6} cy={-18} r={4} fill={C.eggSpot} opacity={0.8} />
      <circle cx={11} cy={-14} r={2.5} fill={C.eggSpot} opacity={0.8} />
    </g>
  );
}

function CrackedEgg() {
  return (
    <g>
      <ellipse cx={0} cy={-4} rx={26} ry={10} fill="#000" opacity={0.07} />
      <path
        d="M0 -56 C 17 -56 27 -34 27 -20 C 27 -6 15 2 0 2 C -15 2 -27 -6 -27 -20 C -27 -34 -17 -56 0 -56 Z"
        fill={C.eggShell}
        stroke={C.eggShade}
        strokeWidth={1.5}
      />
      <ellipse cx={-9} cy={-33} rx={6} ry={9} fill="#fff" opacity={0.5} />
      {/* The crack that makes Day 2 unmistakable. */}
      <path
        d="M-16 -34 L-7 -28 L-12 -20 L-2 -14 L-6 -4"
        fill="none"
        stroke={C.eye}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.55}
      />
      <path
        d="M12 -42 L6 -35 L13 -30"
        fill="none"
        stroke={C.eye}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.4}
      />
      <circle cx={9} cy={-16} r={3} fill={C.eggSpot} opacity={0.75} />
    </g>
  );
}

/** One fox drawing, scaled per life stage. */
function Fox({ scale, glow }: { scale: number; glow: boolean }) {
  return (
    <g transform={`scale(${scale})`}>
      {glow ? (
        <>
          <ellipse cx={0} cy={-26} rx={44} ry={40} fill={C.sun} opacity={0.18} />
          <g className="anim-twinkle">
            <Sparkle x={-34} y={-56} />
            <Sparkle x={38} y={-44} />
            <Sparkle x={26} y={-70} />
          </g>
        </>
      ) : null}
      <ellipse cx={0} cy={0} rx={24} ry={7} fill="#000" opacity={0.08} />

      {/* tail */}
      <path
        d="M-14 -18 C -40 -18 -44 -44 -28 -50 C -20 -53 -14 -46 -18 -40 C -24 -31 -18 -24 -10 -24 Z"
        fill={C.fur}
        stroke={C.furDark}
        strokeWidth={1.2}
      />
      <path
        d="M-30 -49 C -36 -47 -38 -42 -35 -38 C -31 -43 -26 -46 -30 -49 Z"
        fill={C.cream}
      />

      {/* body */}
      <ellipse cx={-2} cy={-16} rx={19} ry={15} fill={C.fur} />
      <ellipse cx={-1} cy={-12} rx={12} ry={10} fill={C.cream} />

      {/* legs */}
      <rect x={-12} y={-8} width={7} height={9} rx={3} fill={C.furDark} />
      <rect x={3} y={-8} width={7} height={9} rx={3} fill={C.furDark} />

      {/* head */}
      <circle cx={10} cy={-38} r={15} fill={C.fur} />
      {/* ears */}
      <path
        d="M-1 -50 L3 -64 L12 -52 Z"
        fill={C.fur}
        stroke={C.furDark}
        strokeWidth={1}
      />
      <path d="M2 -52 L4 -60 L9 -53 Z" fill={C.earInner} />
      <path
        d="M19 -51 L24 -63 L28 -48 Z"
        fill={C.fur}
        stroke={C.furDark}
        strokeWidth={1}
      />
      <path d="M21 -51 L24 -59 L26 -49 Z" fill={C.earInner} />
      {/* muzzle */}
      <ellipse cx={22} cy={-33} rx={8} ry={6.5} fill={C.cream} />
      <circle cx={27} cy={-34} r={2} fill={C.eye} />
      {/* eye */}
      <circle cx={13} cy={-40} r={2.4} fill={C.eye} />
      <circle cx={13.8} cy={-40.8} r={0.9} fill="#fff" />
    </g>
  );
}

function Sparkle({ x, y }: { x: number; y: number }) {
  return (
    <path
      d={`M${x} ${y - 5} L${x + 1.6} ${y - 1.6} L${x + 5} ${y} L${x + 1.6} ${y + 1.6} L${x} ${y + 5} L${x - 1.6} ${y + 1.6} L${x - 5} ${y} L${x - 1.6} ${y - 1.6} Z`}
      fill={C.sun}
    />
  );
}

/** Small standalone preview used by the pet page header. */
export function PetBadge({ state, size = 96 }: { state: PetState; size?: number }) {
  return (
    <svg viewBox="-60 -80 120 92" width={size} height={(size * 92) / 120}>
      <PetSprite state={state} x={0} y={0} />
    </svg>
  );
}
