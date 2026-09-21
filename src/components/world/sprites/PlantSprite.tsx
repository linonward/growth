"use client";

import { PALETTE as C } from "@/components/world/palette";
import type { PlantState } from "@/domain/types";

interface PlantSpriteProps {
  state: PlantState;
  /** Anchor point; the plant grows upward from here. */
  x: number;
  y: number;
}

const STAGE_INDEX: Record<PlantState, number> = {
  seed: 0,
  sprout: 1,
  leaf: 2,
  young_plant: 3,
  bud: 4,
  tree: 5,
  bloom: 6,
};

/**
 * The seven plant stages.
 *
 * Growth is cumulative by design: each stage draws everything the previous one
 * had plus a little more, so a student can literally see accumulation. Layer
 * order is explicit so the trunk always sits behind the foliage.
 */
export function PlantSprite({ state, x, y }: PlantSpriteProps) {
  const stage = STAGE_INDEX[state];
  return (
    <g
      transform={`translate(${x} ${y})`}
      data-testid="plant-sprite"
      data-plant-state={state}
    >
      <ellipse cx={0} cy={0} rx={24} ry={6} fill={C.shadow} opacity={0.07} />
      <ellipse cx={0} cy={-2} rx={17} ry={5} fill={C.soilDeep} opacity={0.45} />

      <Seed />
      {stage >= STAGE_INDEX.tree ? <Trunk /> : null}
      {stage >= STAGE_INDEX.sprout ? <Sprout /> : null}
      {stage >= STAGE_INDEX.leaf ? <Leaves /> : null}
      {stage >= STAGE_INDEX.young_plant ? <Bush /> : null}
      {/* The bud only shows while it is still the top of the plant; once the
          canopy exists it would float inside the foliage. */}
      {stage >= STAGE_INDEX.bud && stage < STAGE_INDEX.tree ? <Bud /> : null}
      {stage >= STAGE_INDEX.tree ? <Canopy /> : null}
      {stage >= STAGE_INDEX.bloom ? <Blossoms /> : null}
    </g>
  );
}

function Seed() {
  return (
    <g>
      <ellipse cx={0} cy={-5} rx={7} ry={4.5} fill={C.soil} />
      <ellipse cx={0} cy={-7} rx={3.2} ry={3.8} fill={C.seed} />
    </g>
  );
}

/** Drawn before the foliage so it reads as a trunk behind the leaves. */
function Trunk() {
  return (
    <path
      d="M-6 -6 C -4 -30 -5 -46 -6 -62 L6 -62 C 5 -46 4 -30 6 -6 Z"
      fill={C.soil}
      stroke={C.soilDeep}
      strokeWidth={1}
    />
  );
}

function Sprout() {
  return (
    <g className="anim-sway">
      <path d="M0 -6 L0 -15" stroke={C.stemDeep} strokeWidth={2} strokeLinecap="round" />
      <path d="M0 -15 C -9 -19 -10 -26 -3 -25 C 1 -24 1 -19 0 -15 Z" fill={C.leafDeep} />
      <path d="M0 -15 C 9 -20 11 -27 4 -26 C 0 -25 -1 -19 0 -15 Z" fill={C.stem} />
    </g>
  );
}

function Leaves() {
  return (
    <g className="anim-sway">
      <path
        d="M0 -6 L0 -32"
        stroke={C.stemDeep}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      <path
        d="M0 -18 C -13 -22 -15 -32 -6 -31 C -1 -30 -1 -23 0 -18 Z"
        fill={C.leafDeep}
      />
      <path d="M0 -24 C 13 -28 15 -38 6 -37 C 1 -36 1 -29 0 -24 Z" fill={C.stem} />
      <path d="M0 -31 C -11 -35 -12 -44 -4 -43 C 0 -42 0 -36 0 -31 Z" fill={C.leafPale} />
    </g>
  );
}

function Bush() {
  return (
    <g className="anim-sway">
      <path
        d="M0 -30 L0 -42"
        stroke={C.stemDeep}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <circle cx={-11} cy={-36} r={11} fill={C.leafPale} />
      <circle cx={11} cy={-38} r={12} fill={C.stem} />
      <circle cx={0} cy={-46} r={13} fill={C.leafDeep} opacity={0.85} />
    </g>
  );
}

function Bud() {
  return (
    <g className="anim-sway">
      <path
        d="M0 -46 L0 -52"
        stroke={C.stemDeep}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <ellipse cx={0} cy={-57} rx={6.5} ry={8} fill={C.blossom} />
      <path d="M-5 -54 C -2 -66 2 -66 5 -54 Z" fill={C.blossomDeep} opacity={0.5} />
    </g>
  );
}

/** Tree-stage foliage, drawn over the trunk. */
function Canopy() {
  return (
    <g className="anim-sway">
      <circle cx={-26} cy={-74} r={21} fill={C.stem} />
      <circle cx={26} cy={-76} r={22} fill={C.leafDeep} />
      <circle cx={0} cy={-92} r={27} fill={C.leafPale} />
      <circle cx={-12} cy={-76} r={20} fill={C.stem} />
      <circle cx={13} cy={-66} r={17} fill={C.leafDeep} opacity={0.9} />
    </g>
  );
}

function Blossoms() {
  const spots: Array<[number, number]> = [
    [-24, -84],
    [20, -88],
    [-6, -100],
    [28, -66],
    [-30, -64],
    [4, -74],
    [-14, -68],
    [12, -102],
    [-38, -76],
  ];
  return (
    <g>
      {spots.map(([cx, cy], i) => (
        // Position on the outer <g>, animation on the inner one, so the CSS
        // transform cannot clobber the SVG translate.
        <g key={i} transform={`translate(${cx} ${cy})`}>
          <g className="anim-twinkle" style={{ animationDelay: `${i * 0.22}s` }}>
            {[0, 72, 144, 216, 288].map((deg) => (
              <ellipse
                key={deg}
                cx={0}
                cy={-3.5}
                rx={2.3}
                ry={3.3}
                fill={C.blossom}
                transform={`rotate(${deg})`}
              />
            ))}
            <circle cx={0} cy={0} r={1.7} fill={C.sun} />
          </g>
        </g>
      ))}
    </g>
  );
}

/** Small standalone preview used by the plant page header. */
export function PlantBadge({ state, size = 120 }: { state: PlantState; size?: number }) {
  return (
    <svg viewBox="-52 -115 104 127" width={size} height={(size * 127) / 104}>
      <PlantSprite state={state} x={0} y={0} />
    </svg>
  );
}
