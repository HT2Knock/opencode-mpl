import { registerFonts } from "mpl";
import { allFonts } from "mpl/fonts/all";
import { buildFigure } from "../src/replay";
import type { MplRenderInput } from "../src/render";

registerFonts(...allFonts);

export interface BarFact {
  readonly label: string | null;
  readonly y: readonly number[];
  readonly w: readonly number[];
  readonly h: readonly number[];
}

export interface Facts {
  readonly theme: string;
  readonly axes: number;
  readonly bars: readonly BarFact[];
  readonly kinds: Readonly<Record<string, number>>;
  readonly legendOn: boolean;
  readonly labeled: number;
  readonly tickMax: number;
  readonly tickStep: number;
  readonly tickLabels: readonly string[];
}

interface Artist {
  readonly kind: string;
  readonly label?: { readonly kind: string; readonly text?: string };
  readonly y?: Float64Array;
  readonly w?: Float64Array;
  readonly h?: Float64Array;
}

interface Node {
  readonly kind: string;
  readonly text?: string;
  readonly nodes?: readonly Node[];
}

function walk(nodes: readonly Node[], visit: (node: Node) => void): void {
  for (const node of nodes) {
    visit(node);
    if (node.kind === "group" && node.nodes) walk(node.nodes, visit);
  }
}

const NUMERIC = /^-?\d+(?:\.\d+)?$/;

export function factsFromSpec(spec: MplRenderInput, theme: string): Facts {
  const fig = buildFigure({
    style: [],
    rc: spec.rc,
    grid: spec.grid,
    calls: spec.calls,
  });
  const kinds: Record<string, number> = {};
  const bars: BarFact[] = [];
  let labeled = 0;
  let legendOn = false;

  for (const axes of fig.axes) {
    legendOn ||= (axes as unknown as { legendSpec: { kind: string } }).legendSpec.kind === "on";
    for (const artist of (axes as unknown as { artists: readonly Artist[] }).artists) {
      kinds[artist.kind] = (kinds[artist.kind] ?? 0) + 1;
      const label = artist.label?.kind === "text" ? (artist.label.text ?? null) : null;
      if (label) labeled += 1;
      if (artist.kind === "bar" && artist.y && artist.w && artist.h) {
        bars.push({ label, y: Array.from(artist.y), w: Array.from(artist.w), h: Array.from(artist.h) });
      }
    }
  }

  const tickLabels: string[] = [];
  walk((fig.toScene() as unknown as { nodes: readonly Node[] }).nodes, (node) => {
    if (node.kind === "text" && node.text && NUMERIC.test(node.text.trim())) tickLabels.push(node.text.trim());
  });

  const values = [...new Set(tickLabels.map(Number))].sort((a, b) => a - b);
  const steps = values.slice(1).map((value, index) => value - values[index]!).sort((a, b) => a - b);
  return {
    theme,
    axes: fig.axes.length,
    bars,
    kinds,
    legendOn,
    labeled,
    tickMax: values.at(-1) ?? 0,
    tickStep: steps.length > 0 ? steps[Math.floor(steps.length / 2)]! : 0,
    tickLabels,
  };
}

export function isStacked(bars: readonly BarFact[]): boolean {
  if (bars.length < 2) return false;
  for (let i = 1; i < bars.length; i++) {
    const bar = bars[i]!;
    const previous = bars[i - 1]!;
    if (bar.y.length !== previous.y.length) return false;
    for (let column = 0; column < bar.y.length; column++) {
      if (Math.abs(bar.y[column]! - (previous.y[column]! + previous.h[column]!)) > 1e-6) return false;
    }
  }
  return true;
}

export function covers(facts: Facts, value: number): boolean {
  return value <= facts.tickMax + facts.tickStep;
}

export function tallestColumn(bars: readonly BarFact[]): number {
  const width = bars[0]?.h.length ?? 0;
  let tallest = 0;
  for (let column = 0; column < width; column++) {
    const total = bars.reduce((sum, bar) => sum + (bar.h[column] ?? 0), 0);
    tallest = Math.max(tallest, total);
  }
  return tallest;
}
