import { expect, test } from "bun:test";
import { covers, factsFromSpec, isStacked, tallestColumn } from "../eval/scene";
import { buildFigure } from "../src/replay";
import type { MplRenderInput } from "../src/render";

const stacked: MplRenderInput = {
  calls: [
    ["bar", [["a", "b"], [300, 500]], { bottom: [0, 0], label: "one" }],
    ["bar", [["a", "b"], [200, 400]], { bottom: [300, 500], label: "two" }],
    ["legend", [], {}],
  ],
};

test("the facts report stacked bars, labels, and the legend", () => {
  const facts = factsFromSpec(stacked, "pro-dark");
  expect(facts.bars.length).toBe(2);
  expect(isStacked(facts.bars)).toBe(true);
  expect(tallestColumn(facts.bars)).toBe(900);
  expect(facts.legendOn).toBe(true);
  expect(facts.labeled).toBe(2);
  expect(covers(facts, 900)).toBe(true);
  expect(facts.theme).toBe("pro-dark");
});

test("a positional width and bottom reach the bars", () => {
  const positional: MplRenderInput = {
    calls: [
      ["bar", [["a", "b"], [300, 500], 0.72, [0, 0]], { label: "one" }],
      ["bar", [["a", "b"], [200, 400], 0.72, [300, 500]], { label: "two" }],
      ["legend", [], {}],
    ],
  };
  const facts = factsFromSpec(positional, "pro-dark");
  expect(isStacked(facts.bars)).toBe(true);
  expect(tallestColumn(facts.bars)).toBe(900);
  expect(facts.labeled).toBe(2);
  expect(facts.bars.every((bar) => bar.w.every((width) => width === 0.72))).toBe(true);
});

test("barh binds a positional height and left", () => {
  const fig = buildFigure({
    style: [],
    calls: [["barh", [["a", "b"], [300, 500], 0.72, [10, 20]], { label: "one" }]],
  });
  const artist = (
    fig.axes[0] as unknown as {
      artists: readonly { kind: string; x: Float64Array; w: Float64Array; h: Float64Array }[];
    }
  ).artists[0]!;
  expect(artist.kind).toBe("bar");
  expect([...artist.x]).toEqual([10, 20]);
  expect([...artist.w]).toEqual([300, 500]);
  expect([...artist.h]).toEqual([0.72, 0.72]);
});

test("grouped bars are not stacked", () => {
  const grouped: MplRenderInput = {
    calls: [
      ["bar", [["a", "b"], [3, 5]], { label: "one" }],
      ["bar", [["a", "b"], [2, 1]], { label: "two" }],
      ["legend", [], {}],
    ],
  };
  expect(isStacked(factsFromSpec(grouped, "pro-dark").bars)).toBe(false);
});
