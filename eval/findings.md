# What the eval found

The first eval ran six tasks with two models, one run each. The baseline used
commit `65772ff`. The second run used `79e8189`, which adds the `bar` guard and
the grouped bar line in the skill.

| Task             | Deepseek before | Deepseek after | Sonnet before | Sonnet after |
| ---------------- | --------------- | -------------- | ------------- | ------------ |
| stacked-bars     | pass, 1 render  | pass, 2        | pass, 1       | pass, 1      |
| grouped-bars     | pass, 7 renders | pass, 1        | pass, 34      | pass, 1      |
| date-series      | pass, 1         | pass, 1        | pass, 1       | pass, 1      |
| heatmap-colorbar | pass, 1         | pass, 2        | pass, 1       | pass, 1      |
| two-panels       | pass, 1         | pass, 1        | pass, 1       | pass, 1      |
| recovery         | pass, 1         | pass, 2        | pass, 1       | pass, 1      |

All 12 runs passed in both rounds. Renders fell from 51 to 15, and loud errors
from 6 to 0.

## The grouped bar loop

The table hides the cost. Sonnet spent 189 seconds and 34 renders on grouped
bars in the baseline. The transcript shows one call shape:

```js
["bar", [x1, series1, width], { label: "Series 1" }];
```

mpl reads the third positional as the keyword object. The number replaces it, so
`label` and `width` are ignored, the bars take the default width, and the legend
stays empty. No error.

The model saw a missing legend and wrong widths. It changed labels, ticks,
titles, and widths for 33 more renders. The same trap caused the longer incident
in the pim session.

Deepseek's seven renders on the same task were layout work. Its transcripts
never used the positional width.

## What changed

- `bar` and `barh` reject a third positional argument. The message names the
  fix.
- The skill says positional arguments stop at `bar(x, height)` and
  `barh(y, width)`, and gives the offset recipe for grouped bars.

## How to read these numbers

One run per task cannot separate a fix from model variance. The 34 to 1 drop is
large, and the transcript shows the mechanism, so the cause is not in doubt. The
one-render changes in the other tasks are noise.

The tasks cover common chart shapes. They do not judge visual quality, tick
overlap, or color choice. A chart that stacks correctly still passes with a
legend over the bars.

## The upstream fix

mpl issue #86 is fixed in ivarvong/mpl#98. `bar(x, height, width, bottom)` and
`barh(y, width, height, left)` now bind positionals as matplotlib does. mpl
throws a TypeError when the keyword object is not a plain object or a method
takes too many arguments. The plugin pins `f1d9d97` and no longer needs its own
guard. The skill teaches the matplotlib form.

The table above records runs with the guard. Do not compare a new run against
it without noting the difference.

## Rerun after the upstream fix

The rerun used `f1d9d97` and the same six tasks with two models. All 12 runs
passed. The run wrote 13 charts from 13 render calls and had no failed calls.

| Task             | DeepSeek      | Sonnet   |
| ---------------- | ------------- | -------- |
| stacked-bars     | pass, 1 chart | pass, 1  |
| grouped-bars     | pass, 1 chart | pass, 1  |
| date-series      | pass, 1 chart | pass, 1  |
| heatmap-colorbar | pass, 2 charts | pass, 1 |
| two-panels       | pass, 1 chart | pass, 1  |
| recovery         | pass, 1 chart | pass, 1  |

The grouped bar loop is gone. Sonnet went from 40 render calls and 189 seconds
to 1 call and 6 seconds. DeepSeek went from 7 charts to 1. Its first call now
uses `bar(x, height, width, bottom)`, and the legend labels reach the bars.

One earlier rerun on the same build had 4 failed calls in 17 attempts, all
recovered on the next call. The failures were `set_axisbelow` and `subplots` as
Axes methods, and one `bar` call with no height. That run passed 12 of 12, but
the old metric reported 0 errors. The transcript stores the error as
`unknown call \"set_axisbelow\"`, so a text search for `unknown call "` misses
it. The runner now reads attempts and failures from the structured tool calls.
The new parser has a test.

The sample is still one run per task. The 40 to 1 drop is large and the session
record shows the cause. The 1 to 2 chart changes are noise.

## Next

- Add the pim chart as a task: eight series, thirteen months, two panels.
- Run each task three times and report a median.
- Add a vision check for overlap and clipping.
- Mine real sessions every week and turn each new failure into a task. The
  sidecar makes that mechanical.
