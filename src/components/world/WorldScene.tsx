"use client";

import { PALETTE as C } from "@/components/world/palette";
import { PetSprite } from "@/components/world/sprites/PetSprite";
import { PlantSprite } from "@/components/world/sprites/PlantSprite";
import {
  Butterfly,
  Clouds,
  Flowers,
  Ground,
  MysteryGate,
  NewArea,
  Rock,
  StarGarden,
  Sun,
} from "@/components/world/sprites/Scenery";
import type { PetSpecies, PetState, PlantState, WorldState } from "@/domain/types";

/** Scene coordinate layout. Exported so the page can place tap targets on top. */
export const SCENE = {
  width: 390,
  height: 340,
  sun: { x: 322, y: 58 },
  rock: { x: 84, y: 268 },
  plant: { x: 150, y: 264 },
  pet: { x: 236, y: 270 },
} as const;

/** How far the camera pans left on Day 7 to reveal the new region. */
const DAY7_PAN = 80;

export interface WorldSceneProps {
  day: number;
  petState: PetState;
  plantState: PlantState;
  worldState: WorldState;
  petSpecies?: PetSpecies;
  petName?: string;
  cloudCount?: number;
  /** Draws a soft highlight ring during a reward moment. */
  highlight?: "pet" | "plant" | "world" | null;
  className?: string;
}

/**
 * The layered world illustration.
 *
 * Everything is plain SVG in absolutely positioned groups (no Canvas), matching
 * the spec's recommendation, so each object stays an independent layer:
 * Background -> Sky -> Sun -> Clouds -> Ground -> Rock -> Plant -> Pet ->
 * Flowers -> Butterfly -> MysteryGate -> NewArea.
 */
export function WorldScene({
  day,
  petState,
  plantState,
  worldState,
  petSpecies = "fox",
  petName,
  cloudCount = 0,
  highlight = null,
  className,
}: WorldSceneProps) {
  const lush = worldState.newAreaUnlocked || worldState.flowerUnlocked;

  return (
    <svg
      viewBox={`0 0 ${SCENE.width} ${SCENE.height}`}
      className={className}
      role="img"
      aria-label={`${day} 天的成长世界`}
      data-testid="world-scene"
      data-day={day}
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={(worldState.skyGlow ? C.sky.bright : C.sky.dim)[0]}
          />
          <stop
            offset="55%"
            stopColor={(worldState.skyGlow ? C.sky.bright : C.sky.dim)[1]}
          />
          <stop
            offset="100%"
            stopColor={(worldState.skyGlow ? C.sky.bright : C.sky.dim)[2]}
          />
        </linearGradient>
        <radialGradient id="glowRing">
          <stop offset="0%" stopColor={C.sun} stopOpacity="0.55" />
          <stop offset="100%" stopColor={C.sun} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background + Sky */}
      <rect x={-200} y={-40} width={800} height={420} fill="url(#sky)" />

      {/*
        The camera pans left on Day 7 so the world feels like it grew.

        This is a CSS transition rather than framer-motion on purpose: it keeps
        the animation library off the critical path of the world screen (which
        is the first thing every student sees). See .scene-camera in globals.css.
      */}
      <g
        className="scene-camera"
        style={{
          transform: `translateX(${worldState.newAreaUnlocked ? -DAY7_PAN : 0}px)`,
        }}
      >
        {/* Sky */}
        <Sun glow={worldState.skyGlow} />
        <Clouds count={cloudCount} />

        {/* Ground */}
        <Ground lush={lush} />

        {/* Day 7's newly discovered region, drawn beyond the original frame */}
        {worldState.newAreaUnlocked ? <NewArea /> : null}

        {/* Scenery */}
        {worldState.rockUnlocked ? <Rock /> : null}
        {/* Behaviour-driven: one star per day the student actually did something */}
        {worldState.starsEarned > 0 ? (
          <StarGarden earned={worldState.starsEarned} />
        ) : null}
        {worldState.flowerUnlocked ? <Flowers /> : null}

        {/* Plant */}
        <PlantSprite state={plantState} x={SCENE.plant.x} y={SCENE.plant.y} />
        {highlight === "plant" ? (
          <circle
            cx={SCENE.plant.x}
            cy={SCENE.plant.y - 44}
            r={56}
            fill="url(#glowRing)"
          />
        ) : null}

        {/* Pet */}
        <PetSprite
          state={petState}
          species={petSpecies}
          x={SCENE.pet.x}
          y={SCENE.pet.y}
          name={petName}
        />
        {highlight === "pet" ? (
          <circle cx={SCENE.pet.x} cy={SCENE.pet.y - 30} r={58} fill="url(#glowRing)" />
        ) : null}

        {/* Butterfly */}
        {worldState.butterflyUnlocked ? <Butterfly /> : null}

        {/* Mystery gate (Day 6+) / rainbow arch (Day 7) */}
        {worldState.mysteryGateUnlocked ? (
          <MysteryGate open={worldState.newAreaUnlocked} />
        ) : null}
      </g>
    </svg>
  );
}
