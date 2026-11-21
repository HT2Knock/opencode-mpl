/**
 * The mpl-charts skill: the reference the model reads before the first chart.
 * Rewritten from the Pi extension's instruction string for OpenCode's Code Mode.
 */
export const SKILL_ID = "mpl-charts";
export const SKILL_NAME = "MPL charts";
export const SKILL_DESCRIPTION =
  "Draw a chart, plot, or figure from data with the mpl renderer (matplotlib 3.11 API): line, bar, scatter, hist, imshow and more, as PNG or SVG.";

export const SKILL_CONTENT = `# MPL charts

Call \`await tools.mpl.render({...})\` inside \`execute\`. The tool reads a JSON figure spec,
replays matplotlib calls in order, writes PNG and/or SVG, and returns the image plus the file paths.

## Spec

\`\`\`js
{ calls, theme?, rc?, grid?, format?, scale?, name?, tight_layout? }
\`\`\`

- \`calls\`: \`[method, [positional args], {kwargs}]\`, applied in order to the current Axes.
  \`ax.plot(x, y, "o-", label="a")\` is \`["plot", [x, y, "o-"], { label: "a" }]\`.
  Wrap every positional argument in the one array: \`["bar", [["a", "b"], [3, 7]], { color: "C1" }]\`.
- \`grid\`: \`{ rows, cols, sharex?, sharey?, width_ratios?, height_ratios? }\`. Axes are numbered
  row-major from 0; \`["sca", [i]]\` makes Axes i current; \`["twinx", []]\` adds a twin and
  makes it current.
- Figure calls take a \`fig.\` prefix: \`fig.text\`, \`fig.suptitle\`, \`fig.supxlabel\`,
  \`fig.supylabel\`, \`fig.subplots_adjust\`, \`fig.autofmt_xdate\`, \`fig.tight_layout\`,
  \`fig.colorbar\`. \`fig.colorbar\` maps the last imshow or color-mapped scatter on the current Axes.
- Values: \`{ "$float": "nan" }\` is NaN. \`{ "$transform": "axes" }\` is \`ax.transAxes\`.
- \`theme\`: a bundled style name, such as \`pro-dark\`, \`pro-slate\` or any matplotlib style.
  Leave it out to use the active OpenCode theme.
- \`rc\`: style overrides, for example \`{ "figure.figsize": [9, 4] }\`.
- \`scale\`: PNG pixel multiplier from 0.25 to 4, default 2 (1440x840 at the default size); 3 for print.
- \`format\`: \`"png"\` (default), \`"svg"\`, or \`"both"\`. Files land in
  \`~/.local/share/opencode/mpl/charts/<date>/\` unless the user set \`outputDir\`.
- \`tight_layout\` runs unless the calls lay out the figure.

## Return value

\`\`\`js
const r = await tools.mpl.render({ calls: [["plot", [[1, 2, 3], [3, 1, 2]]]], name: "trend" })
return r.pngPath // also r.svgPath, r.width, r.height, r.theme
\`\`\`

The image is attached to the tool result, and the transcript only draws it when
\`session.image_preview\` is on. Always report the saved path in your reply, and use a Markdown
image line (\`![name](path)\`) when the user should see it in the transcript.

## Dates

- \`{ "$dates": ["2026-01-01", ...] }\` is \`Date[]\`, \`{ "$date": "..." }\` one \`Date\`; naive ISO
  strings are UTC. \`plot\`, \`bar\`, \`text\`, \`axvline\` and \`fill_between\` take them.
- Ticks: \`["$concise_x", []]\` for \`ConciseDateFormatter\`, or
  \`["$date_x", ["MonthLocator", { interval: 1 }, "%b %d" | "concise"]]\`.
- \`annotate\` takes epoch days (ms / 86400000) as coordinates.

## Colors

Series colors follow the active theme: \`C0\`..\`C7\` are the theme's categorical colors, in order.
Name a color only when it carries meaning (red for a failure, green for a pass). Do not hard-code
a palette.

## Chart types

Line, step, scatter, bar/barh (bottom/left for stacks), hist, boxplot, errorbar, fill_between,
imshow + \`fig.colorbar\`, axhline/axvline/axhspan/axvspan, text, annotate. For shares use barh;
for distributions use hist or boxplot; for legend placement use \`loc\` and \`ncols\`.

## Gotchas

- Unknown kwargs and rc keys throw, as in matplotlib; the error names the call index and the
  offending key.
- Scatter legend: label a proxy \`["plot", [[], [], "o"], { color: "C0", label: "name" }]\`
  rather than the scatter.
- Text: Latin, Greek, arrows and math symbols; use ASCII for tree labels and \`~\` for approximations.
- Keep each series under about 100k points.

## Done when

The image you showed has no overlapping or clipped labels, no legend covering data, and readable
ticks. Otherwise adjust \`figsize\`, ticks, legend \`loc\` or ylim headroom, and render again.
`;
