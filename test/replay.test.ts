import { expect, test } from "bun:test";
import { MPL_AXES_METHODS, MPL_FIGURE_METHODS, decodeValue } from "../src/replay";

test("the Axes allow-list has drawing methods and no private names", () => {
  for (const name of ["plot", "bar", "scatter", "hist", "set_title", "legend", "imshow"]) {
    expect(MPL_AXES_METHODS.has(name)).toBe(true);
  }
  expect([...MPL_AXES_METHODS].some((name) => name.startsWith("_") || name === "constructor")).toBe(false);
});

test("the Figure allow-list has the drawing methods and no renderers", () => {
  for (const name of ["suptitle", "colorbar", "tight_layout"]) expect(MPL_FIGURE_METHODS.has(name)).toBe(true);
  expect(MPL_FIGURE_METHODS.has("toSVG")).toBe(false);
});

test("decodeValue turns $dates, $date and $float into values", () => {
  const dates = decodeValue({ $dates: ["2026-01-02"] }) as Date[];
  expect(dates[0]?.toISOString()).toBe("2026-01-02T00:00:00.000Z");
  expect((decodeValue({ $date: "2026-01-02T03:04:05+01:00" }) as Date).toISOString()).toBe("2026-01-02T02:04:05.000Z");
  expect(Number.isNaN(decodeValue({ $float: "nan" }))).toBe(true);
  expect(decodeValue({ $float: "-inf" })).toBe(-Infinity);
});

test("decodeValue keeps plain objects and arrays", () => {
  expect(decodeValue({ a: [1, 2] })).toEqual({ a: [1, 2] });
});
