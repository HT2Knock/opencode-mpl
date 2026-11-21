/** OpenCode theme palette to an mpl style. All colours are opaque and theme-derived. */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

/** The palette the TUI part writes for the server renderer. */
export interface Palette {
  readonly mode: "dark" | "light";
  readonly background: string;
  readonly text: string;
  readonly muted: string;
  readonly border: string;
  readonly categorical: readonly string[];
}


/** Hue step used for series colours: bright on dark backgrounds, deeper on light ones. */
export function seriesStep(mode: Palette["mode"]): number {
  return mode === "dark" ? 400 : 600;
}

function bareHex(value: string, name: string): string {
  const hex = value.startsWith("#") ? value.slice(1) : value;
  if (!/^[0-9a-f]{6}$/i.test(hex)) throw new Error(`palette ${name} must be a hex colour, got ${JSON.stringify(value)}`);
  return hex.toLowerCase();
}

export function isPalette(value: unknown): value is Palette {
  if (value === null || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    (p.mode === "dark" || p.mode === "light") &&
    typeof p.background === "string" &&
    typeof p.text === "string" &&
    typeof p.muted === "string" &&
    typeof p.border === "string" &&
    Array.isArray(p.categorical) &&
    p.categorical.length > 0 &&
    p.categorical.every((c) => typeof c === "string")
  );
}

/**
 * Builds .mplstyle text from a palette. The layout keys match the bundled pro styles,
 * so a themed chart keeps matplotlib's look and only the colours change.
 */
export function styleFromPalette(palette: Palette): string {
  const background = bareHex(palette.background, "background");
  const text = bareHex(palette.text, "text");
  const muted = bareHex(palette.muted, "muted");
  const border = bareHex(palette.border, "border");
  const cycle = palette.categorical.map((c, i) => `'${bareHex(c, `categorical[${i}]`)}'`).join(", ");
  return [
    `figure.facecolor: ${background}`,
    `axes.facecolor: ${background}`,
    `figure.edgecolor: ${background}`,
    `patch.edgecolor: ${background}`,
    `text.color: ${text}`,
    `axes.titlecolor: ${text}`,
    `axes.labelcolor: ${muted}`,
    `xtick.labelcolor: ${muted}`,
    `ytick.labelcolor: ${muted}`,
    `xtick.color: ${border}`,
    `ytick.color: ${border}`,
    `grid.color: ${border}`,
    `axes.edgecolor: ${border}`,
    `axes.prop_cycle: cycler('color', [${cycle}])`,
    "font.family: Inter",
    "font.size: 9",
    "figure.figsize: 7.2, 4.2",
    "axes.spines.top: False",
    "axes.spines.right: False",
    "axes.spines.left: False",
    "axes.grid: True",
    "axes.grid.axis: y",
    "axes.axisbelow: True",
    "axes.linewidth: 0.8",
    "axes.titlesize: 12",
    "axes.titlelocation: left",
    "axes.titlepad: 10",
    "axes.labelsize: 9",
    "axes.labelpad: 6",
    "grid.linestyle: -",
    "grid.linewidth: 0.6",
    "lines.linewidth: 1.6",
    "lines.solid_capstyle: round",
    "lines.markersize: 5",
    "patch.linewidth: 0",
    "xtick.major.size: 3",
    "xtick.major.width: 0.8",
    "xtick.major.pad: 5",
  ].join("\n");
}

/** Shared palette file: the TUI part writes it, the server renderer reads it. */
export function palettePath(env: NodeJS.ProcessEnv = process.env): string {
  const dataHome = env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  return join(dataHome, "opencode", "mpl", "palette.json");
}

export function readPalette(env: NodeJS.ProcessEnv = process.env): Palette | undefined {
  try {
    const parsed: unknown = JSON.parse(readFileSync(palettePath(env), "utf8"));
    return isPalette(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** Writes through a temporary file, so a reader never sees a half-written palette. */
export function writePalette(palette: Palette, env: NodeJS.ProcessEnv = process.env): string {
  const path = palettePath(env);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(palette));
  renameSync(temporary, path);
  return path;
}

/** CLI settings path: the theme selection lives here, not in opencode.json. */
export function cliSettingsPath(env: NodeJS.ProcessEnv = process.env): string {
  const configHome = env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(configHome, "opencode", "cli.json");
}

/**
 * Bundled style used when no TUI palette reached the server, such as a headless run.
 * `theme.mode` is a TUI setting; "system" cannot be resolved here, so it counts as dark.
 */
export function fallbackStyle(env: NodeJS.ProcessEnv = process.env): string {
  try {
    const raw = readFileSync(cliSettingsPath(env), "utf8");
    const parsed = JSON.parse(raw) as { theme?: { mode?: unknown } };
    return parsed.theme?.mode === "light" ? "pro-slate" : "pro-dark";
  } catch {
    return "pro-dark";
  }
}
