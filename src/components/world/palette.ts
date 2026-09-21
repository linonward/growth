/**
 * Every colour the world scene draws with.
 *
 * This file exists because the scene used to keep a third of its colours inline:
 * three sky-gradient stops covering most of the screen, five ground bands, the
 * rainbow arch's five stripes, the new area's hills and stream, the clouds, the
 * shadows. That was survivable while there was one look. It stops being
 * survivable the moment a second look exists — changing the palette alone would
 * leave the sky, ground and rainbow behind, which reads as a broken world rather
 * than a theme.
 *
 * So the rule for anything that draws the world: **the colour comes from here.**
 * `tests/components/palette.test.ts` enforces it, because a stray `#RRGGBB` in a
 * sprite is invisible until the day someone switches themes and finds a patch
 * that did not move.
 *
 * Shape: shared colours plus groups for the surfaces that *are* a look (sky,
 * ground, scenery). A theme merges over this base, so it only lists what it
 * changes.
 */

export const PALETTE = {
  /* ---------------------------------------------------------------- creatures */
  fur: "#f2a25c",
  furDark: "#de8743",
  furLight: "#ffd3a6",
  cream: "#fff4e6",
  earInner: "#f8c6a4",
  eye: "#4a3b32",

  eggShell: "#fff3df",
  eggShade: "#f0dfc4",
  eggSpot: "#e4cba6",

  /* ------------------------------------------------------------ plant + soil */
  stem: "#7fb87a",
  stemDeep: "#5d9a5b",
  leafPale: "#b7dcaa",
  leafDeep: "#4f8b50",
  soil: "#c9a97d",
  soilDeep: "#ab8a5f",
  /** The seed's shell — darker than the soil so it reads as buried. */
  seed: "#8b6c43",

  blossom: "#f6b6c8",
  blossomDeep: "#e899b0",
  butterfly: "#f4c95d",

  /*
   * Shadows and highlights are not "colour" in the decorative sense, but a
   * theme that leaves them behind is exactly the broken-patch problem this file
   * exists to prevent: a dusk world with a midday shadow reads as a mistake.
   */
  shadow: "#000000",
  shine: "#ffffff",

  /* --------------------------------------------------------------------- sun */
  sun: "#ffd98a",
  sunCore: "#ffc46b",
  cloud: "#ffffff",

  /*
   * The sky gradient cannot be one value: the top of the screen is what a child
   * reads as "morning" or "dusk", so a theme replaces it whole.
   */
  sky: {
    bright: ["#9fd8ff", "#cfebff", "#f4fbff"],
    dim: ["#c6e3f2", "#e0eff7", "#f0f6f9"],
  },

  /*
   * Five bands, distant to near, each of which also shifts when the island turns
   * lush. Kept as one group so a theme cannot replace four of them and leave a
   * stripe behind.
   */
  ground: {
    hill: "#d9ecd1",
    band: { lush: "#c6e4bb", plain: "#d3eac8" },
    mid: { lush: "#b7dcaa", plain: "#c7e5bb" },
    near: { lush: "#9bd08f", plain: "#b4dda6" },
    front: { lush: "#7fb87a", plain: "#98c88f" },
  },

  /* ------------------------------------------------------------------ scenery */
  rock: "#b9b2a6",
  rockDark: "#9a9287",
  rockLight: "#d3cdc3",

  mystery: "#9d8bc4",
  mysteryDeep: "#7e6ba8",
  /** Inside of the stone doorway — darker than the frame around it. */
  gateInner: "#4a4066",

  /** Rainbow arch, outermost stripe first. */
  rainbow: ["#f6b6c8", "#ffd9a0", "#b7dcaa", "#bfe6ff", "#c9b8e8"],

  /* ----------------------------------------------------------------- new area */
  newAreaHill: "#a9d3a0",
  newAreaHillDeep: "#8fc489",
  water: "#a9dcf2",
  waterLight: "#ffffff",
  cabinWall: "#fff3df",
  cabinWindow: "#bfe6ff",
} as const;

export type Palette = typeof PALETTE;

/*
 * The theme *identifier* lives in `domain/world-theme.ts` — it is data about a
 * world, not presentation — and is re-exported here so scene code has one
 * import for anything colour-related.
 */
export type { WorldThemeId } from "@/domain/world-theme";
export { DEFAULT_THEME } from "@/domain/world-theme";
