"use client";

import { PALETTE as C } from "@/components/world/palette";
import type { WorldState } from "@/domain/types";

/** Sun in the top-right corner. Brightens once the world has woken up. */
export function Sun({ glow }: { glow: boolean }) {
  return (
    <g transform="translate(322 58)">
      <circle r={44} fill={C.sun} opacity={glow ? 0.35 : 0.16} />
      <circle r={28} fill={C.sun} opacity={glow ? 0.6 : 0.3} />
      <circle r={20} fill={C.sunCore} />
      {glow ? (
        <g className="anim-twinkle">
          <circle cx={-44} cy={-10} r={3} fill={C.sun} />
          <circle cx={40} cy={16} r={2.5} fill={C.sun} />
          <circle cx={16} cy={-42} r={2.5} fill={C.sun} />
        </g>
      ) : null}
    </g>
  );
}

/** Clouds ramp up across the week so Day 1 never looks like Day 7. */
export function Clouds({ count, y = 0 }: { count: number; y?: number }) {
  const spots: Array<[number, number, number]> = [
    [66, 74, 1],
    [252, 46, 0.78],
    [150, 108, 0.6],
  ];
  return (
    <g transform={`translate(0 ${y})`} opacity={0.9}>
      {spots.slice(0, count).map(([cx, cy, s], i) => (
        // Positioning lives on the outer <g> and the animation on the inner one.
        // A CSS transform (the animation) overrides an SVG `transform` attribute,
        // so combining both on one element would collapse it to the origin.
        <g key={i} transform={`translate(${cx} ${cy}) scale(${s})`}>
          <g
            className="anim-drift"
            style={{ animationDelay: `${i * 1.4}s` }}
            data-testid="cloud"
          >
            <ellipse cx={0} cy={0} rx={30} ry={16} fill="#ffffff" />
            <ellipse cx={-20} cy={4} rx={18} ry={12} fill="#ffffff" />
            <ellipse cx={20} cy={5} rx={20} ry={13} fill="#ffffff" />
          </g>
        </g>
      ))}
    </g>
  );
}

/**
 * Ground.
 *
 * Two pale hill bands sit at the horizon before the main ground. Without them
 * the top ~70% of the scene was flat empty sky, which is what made the world
 * read as unfinished. Everything extends past both edges so the camera can pan
 * on Day 7.
 */
export function Ground({ lush }: { lush: boolean }) {
  return (
    <g>
      {/* distant hills — gives the horizon depth */}
      <path
        d="M-40 232 C 6 198 58 194 100 220 C 138 244 168 232 208 210 C 252 186 302 190 346 218 C 388 244 434 232 470 220 L470 320 L-40 320 Z"
        fill="#D9ECD1"
      />
      <path
        d="M-40 240 C 30 222 92 226 152 234 C 222 243 302 228 362 234 C 402 238 440 232 470 236 L470 330 L-40 330 Z"
        fill={lush ? "#C6E4BB" : "#D3EAC8"}
      />
      {/* main ground bands */}
      <path
        d="M-40 250 C 60 236 140 248 220 246 C 310 244 390 232 470 244 L470 360 L-40 360 Z"
        fill={lush ? "#B7DCAA" : "#C7E5BB"}
      />
      <path
        d="M-40 272 C 70 258 150 270 230 268 C 320 266 400 254 470 266 L470 360 L-40 360 Z"
        fill={lush ? "#9BD08F" : "#B4DDA6"}
      />
      <path
        d="M-40 302 C 80 290 170 300 260 298 C 350 296 420 288 470 296 L470 360 L-40 360 Z"
        fill={lush ? "#7FB87A" : "#98C88F"}
      />
      {/* grass tufts */}
      <g stroke={C.leafDeep} strokeWidth={2} strokeLinecap="round" opacity={0.45}>
        <path d="M40 280 L44 270" />
        <path d="M46 281 L52 273" />
        <path d="M300 276 L304 266" />
        <path d="M308 277 L314 269" />
        <path d="M196 290 L200 280" />
        <path d="M360 284 L364 275" />
        <path d="M120 292 L124 283" />
        <path d="M256 288 L260 279" />
      </g>
    </g>
  );
}

export function Rock() {
  return (
    <g transform="translate(60 268)">
      <ellipse cx={0} cy={4} rx={26} ry={6} fill="#000" opacity={0.08} />
      <path d="M-22 2 C -20 -12 -8 -20 2 -18 C 14 -16 22 -6 22 2 Z" fill={C.rock} />
      <path d="M-22 2 C -20 -6 -14 -12 -6 -14 L-2 2 Z" fill={C.rockDark} opacity={0.5} />
      <path d="M2 -18 C 12 -16 20 -8 21 0 L8 1 Z" fill="#D3CDC3" opacity={0.7} />
    </g>
  );
}

/** The first flower, Day 4's headline change. */
export function Flowers() {
  return (
    <g transform="translate(300 272)" data-testid="flowers">
      <g className="anim-sway">
        <path
          d="M0 0 L0 -22"
          stroke={C.stemDeep}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        <path d="M0 -10 C -9 -13 -10 -19 -3 -18 C 0 -17 0 -13 0 -10 Z" fill={C.stem} />
        <Bloom y={-27} petal={C.blossom} petalRy={5} petalRx={3.4} core={2.6} />
      </g>
      <g transform="translate(22 4) scale(0.75)">
        <g className="anim-sway">
          <path
            d="M0 0 L0 -18"
            stroke={C.stemDeep}
            strokeWidth={2.4}
            strokeLinecap="round"
          />
          <Bloom y={-22} petal={C.blossomDeep} petalRy={4.4} petalRx={3} core={2.2} />
        </g>
      </g>
    </g>
  );
}

/** One five-petal flower head, centred on (0, y). */
function Bloom({
  y,
  petal,
  petalRx,
  petalRy,
  core,
}: {
  y: number;
  petal: string;
  petalRx: number;
  petalRy: number;
  core: number;
}) {
  return (
    <g transform={`translate(0 ${y})`}>
      {[0, 72, 144, 216, 288].map((deg) => (
        <ellipse
          key={deg}
          cx={0}
          cy={-petalRy}
          rx={petalRx}
          ry={petalRy}
          fill={petal}
          transform={`rotate(${deg})`}
        />
      ))}
      <circle r={core} fill={C.sun} />
    </g>
  );
}

/** A butterfly that visits from Day 4 onwards. */
export function Butterfly() {
  return (
    <g transform="translate(344 158)" data-testid="butterfly">
      <g className="anim-float" style={{ animationDuration: "4s" }}>
        <g className="anim-drift">
          <g className="anim-twinkle" style={{ animationDuration: "1.6s" }}>
            <path
              d="M0 0 C -12 -12 -22 -6 -14 4 C -10 9 -4 6 0 0 Z"
              fill={C.mystery}
              opacity={0.85}
            />
            <path
              d="M0 0 C 12 -12 22 -6 14 4 C 10 9 4 6 0 0 Z"
              fill={C.butterfly}
              opacity={0.9}
            />
            <path d="M0 2 C -8 10 -14 8 -10 2 Z" fill={C.mystery} opacity={0.7} />
            <path d="M0 2 C 8 10 14 8 10 2 Z" fill={C.butterfly} opacity={0.75} />
            <ellipse cx={0} cy={1} rx={1.6} ry={5} fill={C.eye} opacity={0.7} />
          </g>
        </g>
      </g>
    </g>
  );
}

/**
 * The mystery gate (Day 6+).
 *
 * Spec Day 6 is an explicit anticipation experiment: the gate appears and
 * stays shut. It only becomes the rainbow arch on Day 7.
 */
export function MysteryGate({ open }: { open: boolean }) {
  if (open) return <RainbowGate />;
  return (
    <g transform="translate(348 250)" data-testid="mystery-gate">
      <ellipse cx={0} cy={8} rx={30} ry={6} fill="#000" opacity={0.08} />
      {/* stone doorway */}
      <path d="M-20 6 L-20 -22 C -20 -38 20 -38 20 -22 L20 6 Z" fill={C.mysteryDeep} />
      <path d="M-13 6 L-13 -20 C -13 -31 13 -31 13 -20 L13 6 Z" fill="#4A4066" />
      {/* vines */}
      <g stroke={C.leafDeep} strokeWidth={3} strokeLinecap="round" fill="none">
        <path d="M-20 2 C -26 -8 -18 -16 -22 -26" />
        <path d="M20 0 C 27 -10 18 -18 24 -28" />
        <path d="M-6 -36 C 0 -30 6 -34 10 -28" />
      </g>
      <g fill={C.stem}>
        <circle cx={-23} cy={-12} r={4} />
        <circle cx={-19} cy={-24} r={3.4} />
        <circle cx={23} cy={-14} r={4} />
        <circle cx={25} cy={-26} r={3.2} />
        <circle cx={4} cy={-33} r={3.4} />
      </g>
      <g transform="translate(0 -50)" data-testid="mystery-question">
        <circle r={11} fill={C.cream} opacity={0.95} />
        <circle
          r={11}
          fill="none"
          stroke={C.mysteryDeep}
          strokeWidth={1.5}
          opacity={0.55}
        />
        <text
          y={5}
          textAnchor="middle"
          fontSize={15}
          fontWeight="bold"
          fill={C.mysteryDeep}
        >
          ?
        </text>
      </g>
      <g className="anim-twinkle">
        <circle cx={-30} cy={-40} r={2.4} fill={C.sun} />
        <circle cx={30} cy={-34} r={2} fill={C.sun} />
      </g>
    </g>
  );
}

/** Day 7: the gate becomes an arch and the world opens up behind it. */
function RainbowGate() {
  const bands = ["#F6B6C8", "#FFD9A0", "#B7DCAA", "#BFE6FF", "#C9B8E8"];
  return (
    <g transform="translate(348 250)" data-testid="rainbow-gate">
      {bands.map((color, i) => (
        <path
          key={color}
          d={`M${-26 - i * 0} 6 A ${26 + i * 4} ${26 + i * 4} 0 0 1 ${26 + i * 0} 6`}
          fill="none"
          stroke={color}
          strokeWidth={5}
          transform={`translate(0 ${-i * 1})`}
          opacity={0.9 - i * 0.06}
        />
      ))}
      <ellipse cx={0} cy={6} rx={26} ry={8} fill={C.sun} opacity={0.35} />
    </g>
  );
}

/**
 * Day 7's new region, drawn just beyond the original 390px frame (x 392..470).
 *
 * The scene camera pans left on Day 7 to reveal it, which is what makes the
 * "the map just got bigger" beat land.
 */
export function NewArea() {
  return (
    <g data-testid="new-area">
      {/* distant hills */}
      <path d="M390 210 C 410 176 436 180 452 208 L452 250 L390 250 Z" fill="#A9D3A0" />
      <path d="M430 214 C 448 188 464 192 478 214 L478 250 L430 250 Z" fill="#8FC489" />
      {/* stream */}
      <path
        d="M390 284 C 414 276 432 294 456 284 L456 304 C 432 314 414 296 390 304 Z"
        fill="#A9DCF2"
      />
      <path
        d="M398 290 C 414 285 430 298 446 291"
        fill="none"
        stroke="#ffffff"
        strokeWidth={2}
        opacity={0.7}
      />
      {/* little house */}
      <g transform="translate(428 260)">
        <rect
          x={-14}
          y={-14}
          width={28}
          height={18}
          rx={3}
          fill="#FFF3DF"
          stroke={C.soil}
          strokeWidth={1.5}
        />
        <path d="M-18 -13 L0 -28 L18 -13 Z" fill={C.blossomDeep} />
        <rect x={-4} y={-6} width={8} height={10} rx={2} fill={C.soil} />
        <rect x={6} y={-11} width={6} height={6} rx={1.5} fill="#BFE6FF" />
      </g>
      {/* new flowers */}
      <FlowerAt x={404} y={276} scale={0.8} color={C.blossom} />
      <FlowerAt x={452} y={272} scale={0.7} color={C.butterfly} />
      <FlowerAt x={470} y={282} scale={0.6} color={C.blossomDeep} />
    </g>
  );
}

function FlowerAt({
  x,
  y,
  scale,
  color,
}: {
  x: number;
  y: number;
  scale: number;
  color: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M0 0 L0 -18" stroke={C.stemDeep} strokeWidth={2.4} strokeLinecap="round" />
      <g transform="translate(0 -22)">
        {[0, 72, 144, 216, 288].map((deg) => (
          <ellipse
            key={deg}
            cx={0}
            cy={-4.4}
            rx={3}
            ry={4.4}
            fill={color}
            transform={`rotate(${deg})`}
          />
        ))}
        <circle r={2.2} fill={C.sun} />
      </g>
    </g>
  );
}

/** The egg-crack burst played during the Day 3 reward. */
export function Burst() {
  return (
    <g data-testid="egg-burst">
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const r = 34;
        return (
          <circle
            key={i}
            cx={Math.cos(angle) * r}
            cy={Math.sin(angle) * r}
            r={4}
            fill={C.sun}
            className="anim-twinkle"
            style={{ animationDelay: `${i * 0.05}s` }}
          />
        );
      })}
    </g>
  );
}

export function sceneFlags(world: WorldState) {
  return {
    flower: world.flowerUnlocked,
    butterfly: world.butterflyUnlocked,
    gate: world.mysteryGateUnlocked,
    newArea: world.newAreaUnlocked,
    rock: world.rockUnlocked,
    skyGlow: world.skyGlow,
  };
}
