import { expect, test } from "bun:test";
import { covers, factsFromSpec, isStacked, tallestColumn } from "../eval/scene";
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

test("a positional width is rejected before the keyword object can be dropped", () => {
  const broken: MplRenderInput = {
    calls: [["bar", [["a", "b"], [300, 500], 0.72], { bottom: [0, 0], label: "one" }]],
  };
  expect(() => factsFromSpec(broken, "pro-dark")).toThrow(/bar takes 2 positional arguments/);
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
