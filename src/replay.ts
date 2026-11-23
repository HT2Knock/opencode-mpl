import {
  AutoDateLocator,
  Axes,
  ConciseDateFormatter,
  DateFormatter,
  DayLocator,
  Figure,
  HourLocator,
  MinuteLocator,
  MonthLocator,
  SecondLocator,
  YearLocator,
  subplots,
} from "mpl";

export type MplCall = readonly [method: string, args?: readonly unknown[], kwargs?: Readonly<Record<string, unknown>>];

export interface MplGrid {
  readonly rows: number;
  readonly cols: number;
  readonly sharex?: boolean | string;
  readonly sharey?: boolean | string;
  readonly width_ratios?: readonly number[];
  readonly height_ratios?: readonly number[];
}

export interface MplFigureSpec {
  readonly style: unknown;
  readonly rc?: Readonly<Record<string, unknown>>;
  readonly grid?: MplGrid;
  readonly calls: readonly MplCall[];
}

export class MplSpecError extends Error {
  override readonly name = "MplSpecError";
}

type Dyn = Record<string, (...args: unknown[]) => unknown>;

const NON_DRAWING_METHODS = new Set(["constructor", "spec", "addAxesAt", "addAxesFromSpec", "add_subplot", "subplots", "toScene"]);

function drawingMethods(proto: object): ReadonlySet<string> {
  const names = new Set<string>();
  for (let p: object | null = proto; p && p !== Object.prototype; p = Object.getPrototypeOf(p)) {
    for (const name of Object.getOwnPropertyNames(p)) {
      if (name.startsWith("_") || NON_DRAWING_METHODS.has(name) || /^to[A-Z]|^svg|^png/.test(name)) continue;
      const descriptor = Object.getOwnPropertyDescriptor(p, name);
      if (descriptor && typeof descriptor.value === "function") names.add(name);
    }
  }
  return names;
}

export const MPL_AXES_METHODS: ReadonlySet<string> = drawingMethods(Axes.prototype);
export const MPL_FIGURE_METHODS: ReadonlySet<string> = new Set(
  ["text", "suptitle", "supxlabel", "supylabel", "subplots_adjust", "autofmt_xdate", "tight_layout", "colorbar"].filter(
    (name) => typeof (Figure.prototype as unknown as Dyn)[name] === "function",
  ),
);
export const MPL_SPECIAL_CALLS = ["sca", "twinx", "$concise_x", "$date_x"] as const;

const DATE_LOCATORS: Readonly<Record<string, new (kw?: unknown) => unknown>> = {
  AutoDateLocator: AutoDateLocator as never,
  YearLocator: YearLocator as never,
  MonthLocator: MonthLocator as never,
  DayLocator: DayLocator as never,
  HourLocator: HourLocator as never,
  MinuteLocator: MinuteLocator as never,
  SecondLocator: SecondLocator as never,
};

function toDate(value: unknown): Date {
  if (typeof value === "number") return new Date(value);
  if (typeof value !== "string") {
    throw new MplSpecError(`$date/$dates expects ISO strings or epoch ms, got ${JSON.stringify(value)}`);
  }
  const hasZone = /([zZ]|[+-]\d\d:?\d\d)$/.test(value);
  const iso = value.includes("T") || value.includes(" ") ? value.replace(" ", "T") : `${value}T00:00`;
  const date = new Date(hasZone ? iso : `${iso}Z`);
  if (Number.isNaN(date.getTime())) throw new MplSpecError(`invalid date ${JSON.stringify(value)}`);
  return date;
}

export function decodeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decodeValue);
  if (value === null || typeof value !== "object") return value;
  const object = value as Record<string, unknown>;
  if ("$dates" in object) {
    if (!Array.isArray(object.$dates)) throw new MplSpecError("$dates expects an array");
    return object.$dates.map(toDate);
  }
  if ("$date" in object) return toDate(object.$date);
  if ("$float" in object) {
    const text = String(object.$float);
    return text === "nan" ? NaN : text === "inf" ? Infinity : text === "-inf" ? -Infinity : Number(text);
  }
  return value;
}

function decodeKwargs(kwargs: Readonly<Record<string, unknown>> | undefined, ax: Axes): Record<string, unknown> {
  const decoded: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(kwargs ?? {})) {
    if (value && typeof value === "object" && "$transform" in value) {
      const transform = (value as { $transform: unknown }).$transform;
      if (transform !== "axes" && transform !== "data") throw new MplSpecError(`$transform must be "axes" or "data"`);
      decoded[key] = transform === "axes" ? ax.transAxes : ax.transData;
    } else decoded[key] = decodeValue(value);
  }
  return decoded;
}

function withKwargs(args: readonly unknown[], kwargs: Record<string, unknown>): unknown[] {
  return Object.keys(kwargs).length > 0 ? [...args, kwargs] : [...args];
}

function unknownMethod(fn: string): MplSpecError {
  return new MplSpecError(
    `unknown call "${fn}". Axes methods: ${[...MPL_AXES_METHODS].sort().join(", ")}. ` +
      `Figure methods (prefix "fig."): ${[...MPL_FIGURE_METHODS].join(", ")}. Special: ${MPL_SPECIAL_CALLS.join(", ")}.`,
  );
}

function applyDateAxis(ax: Axes, args: readonly unknown[]): void {
  const [name, locatorKwargs, formatter] = args as [string, Record<string, unknown> | undefined, string | undefined];
  const Locator = DATE_LOCATORS[name];
  if (!Locator) throw new MplSpecError(`unknown locator ${name}; use one of ${Object.keys(DATE_LOCATORS).join(", ")}`);
  const locator = new Locator(locatorKwargs ?? {});
  ax.xaxis.set_major_locator(locator as never);
  if (formatter === "concise") ax.xaxis.set_major_formatter(new ConciseDateFormatter(locator as never, {}) as never);
  else if (typeof formatter === "string") ax.xaxis.set_major_formatter(new DateFormatter(formatter) as never);
}

function applyCall(
  call: MplCall,
  index: number,
  state: { fig: Figure; axes: Axes[]; ax: Axes },
): void {
  if (!Array.isArray(call) || typeof call[0] !== "string") {
    throw new MplSpecError(`calls[${index}] must be [method, args?, kwargs?], got ${JSON.stringify(call)}`);
  }
  const [fn, args0 = [], kwargs] = call;
  if (!Array.isArray(args0) || Array.isArray(kwargs) || call.length > 3) {
    throw new MplSpecError(
      `calls[${index}] ${fn}: expected [method, [positional args], {kwargs}]; wrap all positional args in one array, ` +
        `e.g. ["bar", [["a", "b"], [3, 7]], { color: "C1" }]`,
    );
  }
  try {
    const args = args0.map(decodeValue);
    if (fn === "sca") {
      const axisIndex = args[0];
      if (typeof axisIndex !== "number" || !state.axes[axisIndex]) {
        throw new MplSpecError(`no Axes ${String(axisIndex)} (have ${state.axes.length})`);
      }
      state.ax = state.axes[axisIndex] as Axes;
      return;
    }
    if (fn === "twinx") {
      state.ax = state.ax.twinx();
      state.axes.push(state.ax);
      return;
    }
    if (fn === "$concise_x") {
      const locator = new AutoDateLocator();
      state.ax.xaxis.set_major_locator(locator as never);
      state.ax.xaxis.set_major_formatter(
        new ConciseDateFormatter(locator as never, (kwargs ?? {}) as never) as never,
      );
      return;
    }
    if (fn === "$date_x") {
      applyDateAxis(state.ax, args0);
      return;
    }
    if (fn.startsWith("fig.")) {
      const name = fn.slice(4);
      if (!MPL_FIGURE_METHODS.has(name)) throw unknownMethod(fn);
      const keywords = decodeKwargs(kwargs, state.ax);
      if (name === "colorbar") {
        const mappable = [...state.ax.artists]
          .reverse()
          .find((artist) => artist.kind === "image" || (artist.kind === "scatter" && artist.mappable.kind === "some"));
        if (!mappable) throw new MplSpecError("no imshow or color-mapped scatter on the current Axes");
        (state.fig as unknown as Dyn).colorbar?.(...withKwargs([mappable], keywords));
        return;
      }
      (state.fig as unknown as Dyn)[name]?.(...withKwargs(args, keywords));
      return;
    }
    if (!MPL_AXES_METHODS.has(fn)) throw unknownMethod(fn);
    (state.ax as unknown as Dyn)[fn]?.(...withKwargs(args, decodeKwargs(kwargs, state.ax)));
  } catch (error) {
    if (error instanceof MplSpecError && error.message.startsWith("calls[")) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new MplSpecError(`calls[${index}] ${fn}: ${message}`);
  }
}

export function buildFigure(spec: MplFigureSpec): Figure {
  const base = { style: spec.style, rc: spec.rc ?? {} };
  let fig: Figure;
  let axes: Axes[];
  if (spec.grid) {
    const { rows, cols, width_ratios, height_ratios, ...gridKw } = spec.grid;
    const ratios = { ...(width_ratios && { width_ratios }), ...(height_ratios && { height_ratios }) };
    const gridspec_kw = Object.keys(ratios).length > 0 ? { gridspec_kw: ratios } : {};
    const [madeFig, madeAxes] = subplots(rows, cols, { ...gridKw, ...gridspec_kw, ...base, squeeze: false } as never);
    fig = madeFig;
    axes = (madeAxes as unknown as Axes[][]).flat();
  } else {
    const [madeFig, madeAxes] = subplots(base as never);
    fig = madeFig;
    axes = [madeAxes];
  }
  const state = { fig, axes, ax: axes[0] as Axes };
  spec.calls.forEach((call, index) => applyCall(call, index, state));
  return fig;
}
