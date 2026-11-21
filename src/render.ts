/** Renders a chart spec to PNG/SVG files. No plugin imports, so tests drive it directly. */
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { availableStyles, registerColormapRgba, registerColormaps, registerFonts } from "mpl";
import { allColormaps } from "mpl/colormaps/all";
import { allColormapRgba } from "mpl/colormaps/all.rgba";
import { allFonts } from "mpl/fonts/all";
import { fallbackStyle, styleFromPalette, type Palette } from "./palette.js";
import { buildFigure, type MplCall, type MplGrid } from "./replay.js";

registerFonts(...allFonts);
registerColormaps(...allColormaps);
registerColormapRgba(...allColormapRgba);

/** Hi-dpi by default: 2x pixels, 1440x840 at the themes' 7.2x4.2 in figure size. */
export const MPL_DEFAULT_SCALE = 2;
/** Every accepted theme name: mpl's bundled styles (pro-slate, pro-dark, ggplot, ...), plus "default". */
export const MPL_THEMES: readonly string[] = [...availableStyles().filter((s) => s !== "default"), "default"];

function themeStyle(theme: string): unknown {
  if (theme === "default") return [];
  if (!MPL_THEMES.includes(theme)) throw new Error(`unknown theme "${theme}"; use one of ${MPL_THEMES.join(", ")}`);
  return theme;
}

export interface MplRenderInput {
  readonly theme?: string;
  readonly rc?: Readonly<Record<string, unknown>>;
  readonly grid?: MplGrid;
  readonly calls: readonly MplCall[];
  readonly format?: "png" | "svg" | "both";
  /** PNG pixel multiplier (hi-dpi). Default MPL_DEFAULT_SCALE. */
  readonly scale?: number;
  /** File stem, such as "latency-by-region". */
  readonly name?: string;
  /** Run fig.tight_layout() after the calls. Default true unless the calls already lay out the figure. */
  readonly tight_layout?: boolean;
}

export interface MplRenderOptions {
  /** Directory for this render. Default: <data dir>/opencode/mpl/charts/<YYYY-MM-DD>. */
  readonly outDir?: string;
  /** Active OpenCode palette. A `theme` in the input wins over it. */
  readonly palette?: Palette;
}

export interface MplRenderOutput {
  readonly png?: Uint8Array;
  readonly pngPath?: string;
  readonly svgPath?: string;
  /** JSON sidecar with the spec that produced the files. */
  readonly specPath?: string;
  readonly width?: number;
  readonly height?: number;
  readonly theme: string;
}

/** Default chart directory: $XDG_DATA_HOME/opencode/mpl/charts/<YYYY-MM-DD>. */
export function defaultChartDir(now = new Date(), env: NodeJS.ProcessEnv = process.env): string {
  const dataHome = env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  return join(dataHome, "opencode", "mpl", "charts", now.toISOString().slice(0, 10));
}

function fileStem(name: string | undefined, now: Date): string {
  const slug = (name ?? "chart").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "chart";
  return `${slug}-${now.toISOString().slice(11, 19).replaceAll(":", "")}`;
}

export interface MplToolReply {
  readonly text: string;
  readonly image?: { readonly uri: string; readonly mime: string; readonly name: string };
}

/** The content the tool returns: paths always, the PNG image when one was written. */
export function toToolReply(result: MplRenderOutput): MplToolReply {
  const paths = [result.pngPath, result.svgPath].filter((path): path is string => typeof path === "string");
  const text = [
    `theme: ${result.theme}`,
    ...(result.width !== undefined && result.height !== undefined ? [`size: ${result.width}x${result.height}`] : []),
    ...paths,
  ].join("\n");
  if (!result.png || !result.pngPath) return { text };
  return {
    text,
    image: {
      uri: `data:image/png;base64,${Buffer.from(result.png).toString("base64")}`,
      mime: "image/png",
      name: basename(result.pngPath),
    },
  };
}

/** PNG width and height from the IHDR chunk. */
function pngSize(png: Uint8Array): { width: number; height: number } {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** The style passed to mpl: the input theme, else the active palette, else the fallback style. */
function resolveStyle(input: MplRenderInput, options: MplRenderOptions): { style: unknown; theme: string } {
  if (input.theme !== undefined) return { style: themeStyle(input.theme), theme: input.theme };
  if (options.palette) return { style: styleFromPalette(options.palette), theme: `opencode-${options.palette.mode}` };
  const fallback = fallbackStyle();
  return { style: themeStyle(fallback), theme: fallback };
}

export function renderChart(input: MplRenderInput, options: MplRenderOptions = {}): MplRenderOutput {
  const { style, theme } = resolveStyle(input, options);
  const scale = input.scale ?? MPL_DEFAULT_SCALE;
  if (!(scale >= 0.25 && scale <= 4)) throw new Error(`scale must be between 0.25 and 4, got ${scale}`);
  const fig = buildFigure({ style, rc: input.rc, grid: input.grid, calls: input.calls });
  const laidOut = input.calls.some((c) => c[0] === "fig.tight_layout" || c[0] === "fig.subplots_adjust");
  if (input.tight_layout ?? !laidOut) fig.tight_layout();

  const format = input.format ?? "png";
  const now = new Date();
  const stem = fileStem(input.name, now);
  const outDir = options.outDir ?? defaultChartDir(now);
  mkdirSync(outDir, { recursive: true });

  let png: Uint8Array | undefined;
  let pngPath: string | undefined;
  let svgPath: string | undefined;
  if (format !== "svg") {
    png = fig.toPNGSync({ scale });
    pngPath = join(outDir, `${stem}.png`);
    writeFileSync(pngPath, png);
  }
  if (format !== "png") {
    svgPath = join(outDir, `${stem}.svg`);
    writeFileSync(svgPath, fig.toSVG());
  }
  const specPath = join(outDir, `${stem}.json`);
  writeFileSync(specPath, JSON.stringify({ spec: input, resolvedTheme: theme, pngPath, svgPath }, null, 2));
  return { png, pngPath, svgPath, specPath, theme, ...(png ? pngSize(png) : {}) };
}
