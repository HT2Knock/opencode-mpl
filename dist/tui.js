// src/tui.ts
import { Plugin } from "@opencode/plugin/tui";

// src/rpc.ts
import { Rpc } from "@opencode/plugin/rpc";
var SET_THEME_INPUT = {
  type: "object",
  properties: {
    mode: { type: "string", enum: ["dark", "light"] },
    background: { type: "string" },
    text: { type: "string" },
    muted: { type: "string" },
    border: { type: "string" },
    categorical: { type: "array", items: { type: "string" }, minItems: 1 }
  },
  required: ["mode", "background", "text", "muted", "border", "categorical"],
  additionalProperties: false
};
var EMPTY_OUTPUT = { type: "object", properties: {}, additionalProperties: false };
var PaletteRpc = Rpc.define({
  id: "mpl-palette",
  methods: {
    setTheme: { input: SET_THEME_INPUT, output: EMPTY_OUTPUT }
  },
  events: {}
});

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
    const categorical = theme.categorical.map((scale) => hex(scale[step]));
    try {
      await context.client.rpc(PaletteRpc).setTheme({
        mode: context.themeMode,
        background: hex(theme.background.base),
        text: hex(theme.text.base),
        muted: hex(theme.text.muted),
        border: hex(theme.border.base),
        categorical
      });
    } catch (error) {
      console.warn(`mpl: palette not sent: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
});
export {
  tui_default as default
};
