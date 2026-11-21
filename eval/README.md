# Agent eval

The eval asks whether an agent can use `tools.mpl.render` to draw the chart a
prompt describes. It scores the figure, not the reply.

## Run

```sh
bun run build
bun run eval
bun run eval -- --tasks stacked-bars,recovery --models opencode-go/deepseek-v4.1-flash
```

The runner needs `opencode` on `PATH` and a model you can call. Each task runs
in a fresh directory under the system temp directory. The runner writes the
transcript and the final spec to that directory.

Results are written to `eval/results/` and printed as a table. Compare two runs
by task and model, not by the total:

```sh
bun eval/compare.ts eval/baseline.json eval/after.json
```

## How a run is scored

1. The prompt runs with `opencode run --format json`.
2. The plugin writes a JSON sidecar next to each chart.
3. The runner takes the sidecars the run added to the default chart directory
   and replays the newest one.
4. `eval/scene.ts` reports what the figure contains: bar series and their bases,
   artist kinds, the legend, the labels, and the y tick labels.
5. The task check turns those facts into a pass or a list of reasons.

A render that produces a file but draws the wrong figure fails, because the
checks read the figure.

The runner records four numbers per task:

| Number  | Meaning                       |
| ------- | ----------------------------- |
| renders | Charts the run wrote          |
| errors  | Loud errors in the transcript |
| theme   | Theme reported by the sidecar |
| seconds | Wall time                     |

Renders above one mean the agent iterated. Errors mean the tool rejected a call.
Neither fails a task by itself.

## Tasks

| ID                 | What it asks                       | Main check                                            |
| ------------------ | ---------------------------------- | ----------------------------------------------------- |
| `stacked-bars`     | Three stacked series with a legend | Bases stack, three labels, y axis covers the total    |
| `grouped-bars`     | Two series side by side            | All bases are zero, two labels                        |
| `date-series`      | Monthly dates on a line            | A line exists on one panel, y axis covers the maximum |
| `heatmap-colorbar` | A 4 by 4 matrix with a colorbar    | An image artist and a second axes                     |
| `two-panels`       | A line and a bar in a 1 by 2 grid  | Two panels, one line, one bar                         |
| `recovery`         | A violin plot                      | A boxplot, because mpl has no violin plot             |

## Add a task

Append to `eval/tasks.ts`. A task has an `id`, a `prompt`, and a `check` that
returns the reasons it failed, or an empty list. Keep the prompt self-contained:
the run directory has no data files.

## Limits

- One run per task by default, so a pass rate is indicative, not statistical.
- Two models with different strengths. A failure on both points at the tool or
  the skill. A failure on one points at the model.
- No visual judge yet. Overlapping labels and poor color choices pass the
  checks.
- The checks cover bars, lines, images, panels, and the legend. They do not
  inspect tick placement or text overlap.
