# Reference

## Tool

The plugin registers one Code Mode tool, `tools.mpl.render`, in the namespace
`mpl`. Call it inside `execute`.

| Field          | Type                       | Default                                  | Meaning                                                 |
| -------------- | -------------------------- | ---------------------------------------- | ------------------------------------------------------- |
| `calls`        | array                      | required                                 | Drawing calls, applied in order                         |
| `theme`        | string                     | active palette                           | Bundled style name, such as `pro-dark` or `pro-slate`   |
| `rc`           | object                     | none                                     | Style overrides, such as `{ "figure.figsize": [9, 4] }` |
| `grid`         | object                     | one Axes                                 | Subplot grid                                            |
| `format`       | `"png"`, `"svg"`, `"both"` | `"png"`                                  | Files to write                                          |
| `scale`        | number, 0.25 to 4          | 2                                        | PNG pixel multiplier                                    |
| `name`         | string                     | `"chart"`                                | File stem                                               |
| `tight_layout` | boolean                    | true unless the calls lay out the figure | Run `fig.tight_layout()`                                |

### Grid

| Field           | Type              | Meaning                |
| --------------- | ----------------- | ---------------------- |
| `rows`          | integer           | Grid rows              |
| `cols`          | integer           | Grid columns           |
| `sharex`        | boolean or string | Share the x axis       |
| `sharey`        | boolean or string | Share the y axis       |
| `width_ratios`  | number array      | Relative column widths |
| `height_ratios` | number array      | Relative row heights   |

Axes are numbered row by row from 0. Select one with `["sca", [index]]`.

### Call shape

A call is `[method, [positional args], {kwargs}]`. A call holds at most three
items, and the second item holds every positional argument.

```js
[
  "bar",
  [
    ["a", "b"],
    [3, 7],
  ],
  { color: "C1" },
];
```

The method is an Axes method, a Figure method with a `fig.` prefix, or a special
call.

Figure methods: `text`, `suptitle`, `supxlabel`, `supylabel`, `subplots_adjust`,
`autofmt_xdate`, `tight_layout`, `colorbar`.

Special calls:

| Call                                     | Effect                                       |
| ---------------------------------------- | -------------------------------------------- |
| `["sca", [i]]`                           | Make Axes `i` current                        |
| `["twinx", []]`                          | Add a twin y axis and make it current        |
| `["$concise_x", []]`                     | Use matplotlib's concise date formatter      |
| `["$date_x", [locator, kwargs, format]]` | Set a date locator and an optional formatter |

Date locators for `$date_x`: `AutoDateLocator`, `YearLocator`, `MonthLocator`,
`DayLocator`, `HourLocator`, `MinuteLocator`, `SecondLocator`.

### Values

| Value                               | Meaning                                    |
| ----------------------------------- | ------------------------------------------ |
| `{ "$date": "2026-01-01" }`         | One `Date`                                 |
| `{ "$dates": ["2026-01-01", ...] }` | An array of `Date`                         |
| `{ "$float": "nan" }`               | NaN; also `inf` and `-inf`                 |
| `{ "$transform": "axes" }`          | `ax.transAxes` instead of data coordinates |

A date string without a zone counts as UTC. A string with `Z` or an offset keeps
its zone.

## Output

`execute` receives an object with these fields:

| Field     | Type             | Meaning                                                    |
| --------- | ---------------- | ---------------------------------------------------------- |
| `pngPath` | string, optional | Absolute path, when a PNG was written                      |
| `svgPath` | string, optional | Absolute path, when an SVG was written                     |
| `width`   | number, optional | PNG width in pixels                                        |
| `height`  | number, optional | PNG height in pixels                                       |
| `theme`   | string           | `opencode-dark`, `opencode-light`, or a bundled style name |

The tool content holds a text block with the theme, the size, and the paths. It
holds an image block when a PNG was written. The `svg` format writes no PNG and
returns no image.

## Files

The default directory is `~/.local/share/opencode/mpl/charts/<YYYY-MM-DD>/`,
using `XDG_DATA_HOME` when it is set. A file is named `<stem>-<HHMMSS>.<ext>`,
where the stem is the `name` input, lowercased with runs of punctuation replaced
by a hyphen.

The plugin does not delete charts. Remove the directory to clean up.

## Plugin option

| Option      | Type   | Default                            | Meaning                  |
| ----------- | ------ | ---------------------------------- | ------------------------ |
| `outputDir` | string | dated directory under the data dir | Where charts are written |

A relative `outputDir` resolves against the session location. When you set
`outputDir`, the plugin writes directly into it and adds no date directory.

```jsonc
{
  "plugins": [
    {
      "package": "/Users/you/personal/opencode-mpl",
      "options": { "outputDir": "outputs/charts" },
    },
  ],
}
```

## Theme resolution

The renderer picks the first source that exists:

1. The `theme` input.
2. The palette file at `~/.local/share/opencode/mpl/palette.json`.
3. The bundled style from `theme.mode` in `~/.config/opencode/cli.json`:
   `pro-slate` for `light`, and `pro-dark` for `dark` or `system`.

[How the theme reaches a chart](theme.md) explains the palette file.

## Errors

A spec mistake fails with `Tool.Error`. The message names the call index and the
method, for example `calls[1] violinplot: unknown call "violinplot"`. An unknown
`theme` or an out-of-range `scale` fails with a message that names the bad
value.

## Limits

- The replayer accepts Axes and Figure drawing methods only.
- An unknown keyword argument throws, as matplotlib does.
- `scale` runs from 0.25 to 4.
- Each series should stay under about 100,000 points.
