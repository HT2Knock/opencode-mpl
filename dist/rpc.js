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
export {
  PaletteRpc
};
