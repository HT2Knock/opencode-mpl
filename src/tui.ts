/** TUI part: writes the active OpenCode theme for the server renderer, once per TUI load. */
import { Plugin } from "@opencode/plugin/tui";
import { seriesStep, writePalette } from "./palette.js";

interface Rgba {
  toInts(): [number, number, number, number];
}

function hex(color: Rgba): string {
  const [r, g, b] = color.toInts();
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

export default Plugin.define({
  id: "mpl-tui",
  async setup(context) {
    const theme = context.theme;
    const step = seriesStep(context.themeMode);
    const palette = {
      mode: context.themeMode,
      background: hex(theme.background.base),
      text: hex(theme.text.base),
      muted: hex(theme.text.muted),
      border: hex(theme.border.base),
      categorical: theme.categorical.map((scale: Record<number, Rgba>) => hex(scale[step] as Rgba)),
    };

    try {
      writePalette(palette);
    } catch (error) {
      console.warn(`mpl: palette not written: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});
