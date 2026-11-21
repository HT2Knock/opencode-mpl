/** The palette bridge contract: the TUI part pushes the resolved theme to the server. */
import { Rpc } from "@opencode/plugin/rpc";

const SET_THEME_INPUT = {
  type: "object",
  properties: {
    mode: { type: "string", enum: ["dark", "light"] },
    background: { type: "string" },
    text: { type: "string" },
    muted: { type: "string" },
    border: { type: "string" },
    categorical: { type: "array", items: { type: "string" }, minItems: 1 },
  },
  required: ["mode", "background", "text", "muted", "border", "categorical"],
  additionalProperties: false,
} as const;

const EMPTY_OUTPUT = { type: "object", properties: {}, additionalProperties: false } as const;

export const PaletteRpc = Rpc.define({
  id: "mpl-palette",
  methods: {
    setTheme: { input: SET_THEME_INPUT, output: EMPTY_OUTPUT },
  },
  events: {},
});
