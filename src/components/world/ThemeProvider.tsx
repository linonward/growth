"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

import { PALETTE, type Palette, type WorldThemeId } from "./palette";
import { themeColors } from "./themes";

/**
 * The colours the world scene is currently drawing with.
 *
 * Why context rather than a module-level lookup: the palette has to be readable
 * during render (it is passed straight into SVG attributes), and resolving it
 * from a global would make the scene depend on mutable module state — the sort
 * of thing that renders one theme on the server and another on the client, or
 * leaks between tests. A provider makes the colour set an explicit input.
 *
 * The default is the pallette itself, not a theme, so a component rendered
 * outside a provider (a unit test, a future preview surface) still gets the
 * standard look rather than nothing or an empty colour.
 */
const ThemeContext = createContext<Palette>(PALETTE);

export function ThemeProvider({
  theme,
  children,
}: {
  theme: WorldThemeId;
  children: ReactNode;
}) {
  const colors = useMemo(() => themeColors(theme), [theme]);
  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
}

/** Every world component reads its colours through this. */
export function useWorldColors(): Palette {
  return useContext(ThemeContext);
}
