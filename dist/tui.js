// src/tui.ts
import { Plugin } from "@opencode/plugin/tui";

// src/palette.ts
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
function palettePath(env = process.env) {
  const dataHome = env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  return join(dataHome, "opencode", "mpl", "palette.json");
}
function writePalette(palette, env = process.env) {
  const path = palettePath(env);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(palette));
  renameSync(temporary, path);
  return path;
}

// src/tui.ts
function hex(color) {
  const [r, g, b] = color.toInts();
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}
var tui_default = Plugin.define({
  id: "mpl-tui",
  async setup(context) {
    const theme = context.theme;
    const step = context.themeMode === "dark" ? 400 : 600;
    const palette = {
      mode: context.themeMode,
      background: hex(theme.background.base),
      text: hex(theme.text.base),
      muted: hex(theme.text.muted),
      border: hex(theme.border.base),
      categorical: theme.categorical.map((scale) => hex(scale[step]))
    };
    try {
      writePalette(palette);
    } catch (error) {
      console.warn(`mpl: palette not written: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
});
export {
  tui_default as default
};
