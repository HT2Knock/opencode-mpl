import { build } from "esbuild";

const external = ["effect", "effect/*", "@opencode/plugin", "@opencode/plugin/*", "@opencode/schema", "@opencode/schema/*"];

await build({
  entryPoints: ["src/index.ts", "src/tui.ts"],
  outdir: "dist",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  external,
  sourcemap: false,
  logLevel: "info",
});
