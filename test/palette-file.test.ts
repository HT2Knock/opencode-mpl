import { afterAll, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { isPalette, palettePath, readPalette, writePalette, type Palette } from "../src/palette";

const home = mkdtempSync(join(tmpdir(), "opencode-mpl-palette-"));
afterAll(() => rmSync(home, { recursive: true, force: true }));

const palette: Palette = {
  mode: "dark",
  background: "#1a1b26",
  text: "#c0caf5",
  muted: "#565f89",
  border: "#2f3549",
  categorical: ["#7aa2f7", "#bb9af7"],
};

test("a written palette reads back", () => {
  const env = { ...process.env, XDG_DATA_HOME: home };
  expect(writePalette(palette, env)).toBe(palettePath(env));
  expect(readPalette(env)).toEqual(palette);
});

test("the palette file is valid JSON with no temporary file left behind", () => {
  const env = { ...process.env, XDG_DATA_HOME: home };
  writePalette(palette, env);
  expect(JSON.parse(readFileSync(palettePath(env), "utf8"))).toEqual(palette);
});

test("a missing file reads as undefined", () => {
  expect(readPalette({ ...process.env, XDG_DATA_HOME: join(home, "missing") })).toBeUndefined();
});

test("invalid JSON and a wrong shape read as undefined", () => {
  const env = { ...process.env, XDG_DATA_HOME: join(home, "broken") };
  const path = palettePath(env);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, "{nope");
  expect(readPalette(env)).toBeUndefined();
  writeFileSync(path, JSON.stringify({ mode: "dark", background: "#000000" }));
  expect(readPalette(env)).toBeUndefined();
});

test("isPalette rejects an empty categorical list", () => {
  expect(isPalette({ ...palette, categorical: [] })).toBe(false);
  expect(isPalette(palette)).toBe(true);
});
