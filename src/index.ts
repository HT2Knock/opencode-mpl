/** OpenCode Plugin part: registers the mpl tool and the mpl-charts skill. */
import { homedir } from "node:os";
import { basename, isAbsolute, join } from "node:path";
import { Plugin, Skill, Tool } from "@opencode/plugin/effect";
import { Effect, Schema } from "effect";
import { readPalette } from "./palette.js";
import { defaultChartDir, renderChart, type MplRenderInput } from "./render.js";
import { SKILL_CONTENT, SKILL_DESCRIPTION, SKILL_ID, SKILL_NAME } from "./skill.js";

const NAMESPACE = "mpl";
const NAMESPACE_DESCRIPTION = "matplotlib-API charts to PNG/SVG; read the mpl-charts skill before the first render";

const GridInput = Schema.Struct({
  rows: Schema.Int,
  cols: Schema.Int,
  sharex: Schema.optional(Schema.Unknown),
  sharey: Schema.optional(Schema.Unknown),
  width_ratios: Schema.optional(Schema.Array(Schema.Number)),
  height_ratios: Schema.optional(Schema.Array(Schema.Number)),
});

const RenderInput = Schema.Struct({
  calls: Schema.Array(Schema.Array(Schema.Unknown)),
  theme: Schema.optional(Schema.String),
  rc: Schema.optional(Schema.Unknown),
  grid: Schema.optional(GridInput),
  format: Schema.optional(Schema.Literals(["png", "svg", "both"])),
  scale: Schema.optional(Schema.Number),
  name: Schema.optional(Schema.String),
  tight_layout: Schema.optional(Schema.Boolean),
});

const RenderOutput = Schema.Struct({
  pngPath: Schema.optional(Schema.String),
  svgPath: Schema.optional(Schema.String),
  width: Schema.optional(Schema.Number),
  height: Schema.optional(Schema.Number),
  theme: Schema.String,
});

const TOOL_DESCRIPTION =
  "Render a matplotlib-style figure from an ordered [method, args, kwargs] call list to PNG/SVG, and return the image plus its file paths.";

type Attempt<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly message: string };

function attempt<T>(run: () => T): Attempt<T> {
  try {
    return { ok: true, value: run() };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * The render directory: the plugin option `outputDir` (relative paths resolve against the
 * session location), else the dated directory under the OpenCode data dir.
 */
function chartDir(options: unknown, directory: string): string {
  const value = (options as Record<string, unknown> | undefined)?.outputDir;
  if (typeof value === "string" && value.length > 0) return isAbsolute(value) ? value : join(directory, value);
  return defaultChartDir();
}

function skillPath(): string {
  return join(homedir(), ".local", "share", "opencode", "mpl", "skills", SKILL_ID, "SKILL.md");
}

export default Plugin.define({
  id: "mpl",
  effect: (ctx) =>
    Effect.gen(function* () {
      const directory = ctx.location.directory;

      yield* ctx.tool.transform((editor) => {
        editor.namespace({ name: NAMESPACE, description: NAMESPACE_DESCRIPTION });
        editor.add({
          name: "render",
          description: TOOL_DESCRIPTION,
          input: RenderInput,
          output: RenderOutput,
          options: { namespace: NAMESPACE },
          execute: (input) =>
            Effect.gen(function* () {
              const palette = readPalette();
              const render = attempt(() =>
                renderChart(input as MplRenderInput, { outDir: chartDir(ctx.options, directory), palette }),
              );
              if (!render.ok) return yield* Effect.fail(new Tool.Error({ message: render.message }));

              const result = render.value;
              const paths = [result.pngPath, result.svgPath].filter((path): path is string => typeof path === "string");
              const details = [
                `theme: ${result.theme}`,
                ...(result.width !== undefined && result.height !== undefined ? [`size: ${result.width}x${result.height}`] : []),
                ...paths,
              ];
              const content: Tool.Content[] = [{ type: "text", text: details.join("\n") }];
              if (result.png && result.pngPath) {
                content.push({
                  type: "file",
                  uri: `data:image/png;base64,${Buffer.from(result.png).toString("base64")}`,
                  mime: "image/png",
                  name: basename(result.pngPath),
                });
              }

              return {
                output: {
                  ...(result.pngPath !== undefined ? { pngPath: result.pngPath } : {}),
                  ...(result.svgPath !== undefined ? { svgPath: result.svgPath } : {}),
                  ...(result.width !== undefined ? { width: result.width } : {}),
                  ...(result.height !== undefined ? { height: result.height } : {}),
                  theme: result.theme,
                },
                content,
              };
            }),
        });
      });

      yield* ctx.skill.transform((editor) => {
        editor.add({
          id: Skill.ID.make(SKILL_ID),
          name: Skill.Name.make(SKILL_NAME),
          description: SKILL_DESCRIPTION,
          path: Skill.Info.fields.path.make(skillPath()),
          content: SKILL_CONTENT,
        });
      }).pipe(Effect.orDie);

      yield* Effect.logDebug(`mpl: ready (charts in ${chartDir(ctx.options, directory)})`);
    }),
});
