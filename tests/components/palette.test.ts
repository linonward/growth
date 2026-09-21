import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DEFAULT_THEME, PALETTE } from "@/components/world/palette";

/**
 * The world scene's colours must all come from the palette.
 *
 * Why this is a test and not a convention: a stray `#RRGGBB` inside a sprite is
 * completely invisible while the world has one look. It only shows up the day a
 * theme switches and a patch of ground, a rainbow stripe or a shadow stays
 * behind — and by then it looks like a rendering bug rather than a missed
 * variable, so it costs far more to find than to prevent.
 *
 * Before this rule existed, a third of the scene's colours were inline: three
 * sky-gradient stops, five ground bands, five rainbow stripes, the new area's
 * hills and stream, clouds, shadows.
 */

const WORLD_DIR = join(process.cwd(), "src/components/world");

function worldComponentFiles(): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".tsx")) files.push(path);
    }
  };
  walk(WORLD_DIR);
  return files;
}

/** `#rgb`, `#rrggbb`, `#rrggbbaa` — anything a browser would accept as a colour. */
const HEX_LITERAL = /#[0-9A-Fa-f]{3,8}\b/g;

describe("world colours live in the palette", () => {
  it("finds no colour literal in any world component", () => {
    const offenders: string[] = [];
    for (const file of worldComponentFiles()) {
      const source = readFileSync(file, "utf8");
      for (const match of source.match(HEX_LITERAL) ?? []) {
        offenders.push(`${file.replace(`${process.cwd()}/`, "")}: ${match}`);
      }
    }
    expect(offenders, "把颜色写进 palette.ts，不要在组件里内联").toEqual([]);
  });

  it("checks the files it thinks it is checking", () => {
    // A test that silently walks an empty directory passes forever.
    const files = worldComponentFiles();
    expect(files.length).toBeGreaterThanOrEqual(4);
    expect(files.some((f) => f.endsWith("WorldScene.tsx"))).toBe(true);
    expect(files.some((f) => f.endsWith("Scenery.tsx"))).toBe(true);
  });
});

describe("palette shape", () => {
  it("names the default theme, which every new world starts on", () => {
    expect(DEFAULT_THEME).toBe("sunny");
  });

  it("keeps the surfaces a theme must replace whole", () => {
    // These are the ones that would look broken if a theme replaced only part
    // of them, so they are grouped rather than free-standing values.
    expect(PALETTE.sky.bright).toHaveLength(3);
    expect(PALETTE.sky.dim).toHaveLength(3);
    expect(PALETTE.rainbow).toHaveLength(5);
    // Five ground bands, each with a lush and a plain variant.
    for (const key of ["band", "mid", "near", "front"] as const) {
      expect(PALETTE.ground[key]).toMatchObject({
        lush: expect.stringMatching(HEX_LITERAL),
        plain: expect.stringMatching(HEX_LITERAL),
      });
    }
    expect(PALETTE.ground.hill).toMatch(HEX_LITERAL);
  });

  it("has no colour value that is not a hex literal", () => {
    // Catches a token accidentally set to a CSS name or an empty string, which
    // would fail silently in SVG rather than throwing.
    const walk = (value: unknown, path: string): void => {
      if (typeof value === "string") {
        expect(value, `${path} 不是十六进制颜色`).toMatch(/^#[0-9A-Fa-f]{6}$/);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((v, i) => walk(v, `${path}[${i}]`));
        return;
      }
      if (value && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
      }
    };
    walk(PALETTE, "PALETTE");
  });
});
