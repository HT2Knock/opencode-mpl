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

export const MPL_DEFAULT_SCALE = 2;
export const MPL_THEMES: readonly string[] = [...availableStyles().filter((style) => style !== "default"), "default"];

const PNG_IHDR_WIDTH_OFFSET = 16;
const PNG_IHDR_HEIGHT_OFFSET = 20;

function styleForTheme(theme: string): unknown {
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
  readonly scale?: number;
  readonly name?: string;
  readonly tight_layout?: boolean;
}

export interface MplRenderOptions {
  readonly outDir?: string;
  readonly palette?: Palette;
}

export interface MplRenderOutput {
  readonly png?: Uint8Array;
  readonly pngPath?: string;
  readonly svgPath?: string;
  readonly specPath?: string;
  readonly width?: number;
  readonly height?: number;
  readonly theme: string;
}

export function defaultChartDir(now = new Date(), env: NodeJS.ProcessEnv = process.env): string {
  const dataHome = env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  return join(dataHome, "opencode", "mpl", "charts", now.toISOString().slice(0, 10));
}

function fileStem(name: string | undefined, now: Date): string {
  const slug =
    (name ?? "chart")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "chart";
  return `${slug}-${now.toISOString().slice(11, 19).replaceAll(":", "")}`;
}

export interface MplToolReply {
  readonly text: string;
  readonly image?: { readonly uri: string; readonly mime: string; readonly name: string };
}

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

function pngSize(png: Uint8Array): { width: number; height: number } {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(PNG_IHDR_WIDTH_OFFSET), height: view.getUint32(PNG_IHDR_HEIGHT_OFFSET) };
}

function resolveStyle(input: MplRenderInput, options: MplRenderOptions): { style: unknown; theme: string } {
  if (input.theme !== undefined) return { style: styleForTheme(input.theme), theme: input.theme };
  if (options.palette) return { style: styleFromPalette(options.palette), theme: `opencode-${options.palette.mode}` };
  const fallback = fallbackStyle();
  return { style: styleForTheme(fallback), theme: fallback };
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
