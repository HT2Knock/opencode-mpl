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

## Next

- Add the pim chart as a task: eight series, thirteen months, two panels.
- Run each task three times and report a median.
- Add a vision check for overlap and clipping.
- Mine real sessions every week and turn each new failure into a task. The
  sidecar makes that mechanical.
