import { covers, isStacked, tallestColumn, type Facts } from "./scene";

export interface RunInfo {
  readonly renders: number;
  readonly errors: number;
  readonly transcript: string;
}

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly prompt: string;
  readonly check: (facts: Facts, run: RunInfo) => string[];
}

const NO_LEGEND = "the chart has no legend";

export const tasks: readonly Task[] = [
  {
    id: "stacked-bars",
    title: "Stacked bars with a legend",
    prompt:
      "Draw a stacked bar chart of quarterly revenue by region. North: 120, 140, 90, 160. South: 80, 95, 110, 100. West: 60, 70, 75, 90. The three series stack in that order for Q1 to Q4. Add a legend and a title, and save it as stacked-revenue.",
    check(facts) {
      const reasons: string[] = [];
      if (facts.bars.length !== 3) reasons.push(`expected 3 bar series, got ${facts.bars.length}`);
      if (!isStacked(facts.bars)) reasons.push("the bars are not stacked");
      if (!facts.legendOn) reasons.push(NO_LEGEND);
      if (facts.labeled < 3) reasons.push(`expected 3 labelled series, got ${facts.labeled}`);
      if (!covers(facts, tallestColumn(facts.bars))) reasons.push("the top of the stack is above the y axis");
      return reasons;
    },
  },
  {
    id: "grouped-bars",
    title: "Grouped bars side by side",
    prompt:
      "Draw a grouped bar chart comparing two series across three categories. Cats: 4 and 6. Dogs: 3 and 5. Birds: 2 and 7. Put the two series side by side, not stacked, add a legend, and save it as grouped-pets.",
    check(facts) {
      const reasons: string[] = [];
      if (facts.bars.length !== 2) reasons.push(`expected 2 bar series, got ${facts.bars.length}`);
      if (facts.bars.some((bar) => bar.y.some((base) => base !== 0))) reasons.push("a series has a non-zero base, so the bars are stacked");
      if (!facts.legendOn) reasons.push(NO_LEGEND);
      if (facts.labeled < 2) reasons.push(`expected 2 labelled series, got ${facts.labeled}`);
      if (!covers(facts, 7)) reasons.push(`the y axis stops at ${facts.tickMax}, below the tallest value 7`);
      return reasons;
    },
  },
  {
    id: "date-series",
    title: "Monthly dates on a line",
    prompt:
      "Plot a monthly time series for 2026-01-01 through 2026-06-01 with values 10, 12, 9, 15, 18, 21. Use real date values for the x axis, add markers, and save it as monthly-trend.",
    check(facts) {
      const reasons: string[] = [];
      if ((facts.kinds.line ?? 0) < 1) reasons.push("no line was drawn");
      if (facts.axes !== 1) reasons.push(`expected 1 panel, got ${facts.axes}`);
      if (!covers(facts, 21)) reasons.push(`the y axis stops at ${facts.tickMax}, below the largest value 21`);
      return reasons;
    },
  },
  {
    id: "heatmap-colorbar",
    title: "Heatmap with a colorbar",
    prompt:
      "Draw a 4 by 4 heatmap from this matrix, top row first: [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16]]. Add a colorbar and a title, and save it as matrix-heatmap.",
    check(facts) {
      const reasons: string[] = [];
      if ((facts.kinds.image ?? 0) < 1) reasons.push("no image was drawn");
      if (facts.axes < 2) reasons.push("no colorbar axes were drawn");
      return reasons;
    },
  },
  {
    id: "two-panels",
    title: "Two panels with a shared axis",
    prompt:
      "Make a 1 by 2 panel figure. The left panel is a line of 1, 4, 9, 16. The right panel is a bar chart of 3, 1, 2. Share the x axis, give each panel its own title, and save it as two-panels.",
    check(facts) {
      const reasons: string[] = [];
      if (facts.axes < 2) reasons.push(`expected 2 panels, got ${facts.axes}`);
      if ((facts.kinds.line ?? 0) < 1) reasons.push("the left panel has no line");
      if ((facts.kinds.bar ?? 0) < 1) reasons.push("the right panel has no bars");
      return reasons;
    },
  },
  {
    id: "recovery",
    title: "Recover from an unsupported call",
    prompt:
      "Draw a violin plot of three groups: [1,2,3], [4,5,6], [2,8,9]. If this renderer cannot draw a violin plot, use a boxplot instead, say what you changed, and save it as group-shape.",
    check(facts) {
      const reasons: string[] = [];
      if ((facts.kinds.sticky ?? 0) < 1) reasons.push("no boxplot was drawn");
      return reasons;
    },
  },
];

