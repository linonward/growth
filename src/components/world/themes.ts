import type { WorldThemeId } from "@/domain/world-theme";

import { PALETTE, type Palette } from "./palette";

/**
 * What each look is called in the picker — presentation only.
 *
 * The ladder order and the unlock rule live in `domain/world-theme.ts`, because
 * they are data the export and the analysis depend on. This file holds the parts
 * a translator could change without touching a rule.
 *
 * Picked to sit at the same lightness and saturation as the default: if one
 * theme were obviously prettier, every child would pick that one and the
 * measurement would be of taste rather than of anything about the world.
 */
export const THEME_LABELS: Readonly<
  Record<WorldThemeId, { label: string; hint: string }>
> = {
  sunny: { label: "晴天", hint: "现在的样子" },
  night: { label: "星空", hint: "天黑之后的世界" },
  autumn: { label: "秋天", hint: "叶子变黄的时候" },
};

/** What each look overrides. Anything omitted keeps the default colour. */
const THEME_OVERRIDES: Readonly<Record<WorldThemeId, ThemeOverrides>> = {
  sunny: {},
  night: {
    /*
     * Pushed further than a tint on purpose. The first attempt only shifted the
     * sky and left the ground green, which read as the same world through a
     * filter rather than as a different one — the ground now goes violet-grey,
     * so the plants and the fox are the only living colour on screen.
     *
     * `blossom` is deliberately untouched: a warm pink flower in a cold dark
     * world is the one thing that should still look alive.
     */
    sky: {
      bright: ["#2f3358", "#4a4676", "#7d6f96"],
      dim: ["#282c4e", "#413e69", "#6f6488"],
    },
    ground: {
      hill: "#5a5570",
      band: { lush: "#4f5a63", plain: "#565268" },
      mid: { lush: "#464f58", plain: "#4c495e" },
      near: { lush: "#3d4550", plain: "#434055" },
      front: { lush: "#353c47", plain: "#3a384c" },
    },
    sun: "#f4ecc9",
    sunCore: "#fbf5dd",
    cloud: "#cfcade",
    rockLight: "#6d6880",
    water: "#4d6b96",
    rainbow: ["#a98bb0", "#c2a882", "#8fa39a", "#8fa8c4", "#9d92c0"],
  },
  autumn: {
    sky: {
      bright: ["#ffdcae", "#fff0d0", "#fffaf0"],
      dim: ["#efd7bb", "#f8ead6", "#fdf8f0"],
    },
    ground: {
      hill: "#f0e3bd",
      band: { lush: "#eaddb0", plain: "#ece0b8" },
      mid: { lush: "#dcc890", plain: "#e0cd9c" },
      near: { lush: "#c9ab68", plain: "#cdb478" },
      front: { lush: "#b08f4e", plain: "#b89a5f" },
    },
    sun: "#ffc978",
    sunCore: "#ffb75c",
    blossom: "#e8a06a",
    blossomDeep: "#d4844f",
    butterfly: "#e8a24a",
    rainbow: ["#f0b88a", "#ffd9a0", "#cfc089", "#c9dcb4", "#d8bcd8"],
  },
};

/**
 * The subset of colours a theme may override — every field optional.
 *
 * Written out longhand rather than derived from `Palette` with a mapped type:
 * two attempts at the clever version silently widened the nested groups (the
 * `sky` and `ground` keys vanished from the error messages, so a theme could
 * have misspelled them and still compiled). A theme that fails to recolour the
 * sky is the exact failure this whole refactor exists to prevent, so the type is
 * spelled out where it can be read.
 *
 * Note what a theme *cannot* touch: the creature, plant and egg colours. Those
 * are the child's progress and belong to the story, not to the wallpaper.
 */
interface ThemeOverrides {
  readonly shadow?: string;
  readonly shine?: string;
  readonly sun?: string;
  readonly sunCore?: string;
  readonly cloud?: string;
  readonly sky?: {
    readonly bright?: readonly string[];
    readonly dim?: readonly string[];
  };
  readonly ground?: {
    readonly hill?: string;
    readonly band?: { readonly lush?: string; readonly plain?: string };
    readonly mid?: { readonly lush?: string; readonly plain?: string };
    readonly near?: { readonly lush?: string; readonly plain?: string };
    readonly front?: { readonly lush?: string; readonly plain?: string };
  };
  readonly rock?: string;
  readonly rockDark?: string;
  readonly rockLight?: string;
  readonly mystery?: string;
  readonly mysteryDeep?: string;
  readonly gateInner?: string;
  readonly rainbow?: readonly string[];
  readonly newAreaHill?: string;
  readonly newAreaHillDeep?: string;
  readonly water?: string;
  readonly waterLight?: string;
  readonly cabinWall?: string;
  readonly cabinWindow?: string;
  /*
   * Plant and creature colours: only the ones a season legitimately changes.
   * A theme that recoloured the fox would be telling a different story.
   */
  readonly blossom?: string;
  readonly blossomDeep?: string;
  readonly butterfly?: string;
  readonly leafPale?: string;
}

/** A theme's full colour set: the base palette with that theme merged over it. */
export function themeColors(id: WorldThemeId): Palette {
  return merge(PALETTE, THEME_OVERRIDES[id] ?? {}) as unknown as Palette;
}

function merge(base: unknown, over: unknown): unknown {
  if (Array.isArray(over)) return over;
  if (typeof over !== "object" || over === null) return over ?? base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(over as Record<string, unknown>)) {
    out[key] = value === undefined ? out[key] : merge(out[key], value);
  }
  return out;
}
