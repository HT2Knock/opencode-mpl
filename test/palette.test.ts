import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { styleFromPalette, type Palette } from "../src/palette";

const dark: Palette = {
  mode: "dark",
  background: "#1a1b26",
  text: "#c0caf5",
  muted: "#565f89",
  border: "#2f3549",
  categorical: ["#7aa2f7", "#bb9af7", "#9ece6a"],
};

test("the style maps every palette token to a style key", () => {
  const style = styleFromPalette(dark);
  expect(style).toContain("figure.facecolor: 1a1b26");
  expect(style).toContain("axes.facecolor: 1a1b26");
  expect(style).toContain("text.color: c0caf5");
  expect(style).toContain("axes.labelcolor: 565f89");
  expect(style).toContain("grid.color: 2f3549");
  expect(style).toContain("axes.edgecolor: 2f3549");
});

test("the style keeps the categorical order in the property cycle", () => {
  expect(styleFromPalette(dark)).toContain("axes.prop_cycle: cycler('color', ['7aa2f7', 'bb9af7', '9ece6a'])");
});

test("the style keeps the pro layout keys", () => {
  const style = styleFromPalette(dark);
  for (const key of ["font.family: Inter", "figure.figsize: 7.2, 4.2", "axes.spines.top: False", "lines.linewidth: 1.6"]) {
    expect(style).toContain(key);
  }
});

test("a non-hex color is rejected", () => {
  expect(() => styleFromPalette({ ...dark, background: "sky" })).toThrow(/background must be a hex color/);
});

test("hex colors with and without # are both accepted", () => {
  expect(styleFromPalette({ ...dark, border: "2F3549" })).toContain("grid.color: 2f3549");
});
