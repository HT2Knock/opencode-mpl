/** TUI part: pushes the active OpenCode theme to the server once, at plugin load. */
import { Plugin } from "@opencode/plugin/tui";
import { PaletteRpc } from "./rpc.js";

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
    const step = context.themeMode === "dark" ? 400 : 600;
    const categorical = theme.categorical.map((scale: Record<number, Rgba>) => hex(scale[step] as Rgba));

    try {
      await context.client.rpc(PaletteRpc).setTheme({
        mode: context.themeMode,
        background: hex(theme.background.base),
        text: hex(theme.text.base),
        muted: hex(theme.text.muted),
        border: hex(theme.border.base),
        categorical,
      });
    } catch (error) {
      console.warn(`mpl: palette not sent: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});
