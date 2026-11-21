# opencode-mpl

An OpenCode plugin that draws charts with
[mpl](https://github.com/ivarvong/mpl), a pure-JavaScript reimplementation of
matplotlib 3.11. The model writes a JSON figure spec; the plugin replays it,
writes PNG/SVG, and returns the image plus the file paths.

The plugin is a port of
[Dillon Mulroy's Pi extension](https://github.com/dmmulroy/.dotfiles/tree/main/home/.pi/agent/extensions/mpl)
to the OpenCode 2 plugin API. It runs no Python and no browser.

## What you get

- `tools.mpl.render` inside Code Mode, plus a short `mpl-charts` skill the model
  reads first.
- matplotlib's object API: `plot`, `bar`, `barh`, `scatter`, `hist`, `boxplot`,
  `errorbar`, `fill_between`, `imshow`, `annotate`, text, reference lines,
  subplot grids, twin axes, dates.
- PNG at 2x by default (1440x840) and SVG.
- Charts coloured by the active OpenCode theme, with a fallback style for
  headless runs.

## Install

From a local checkout:

```jsonc title="~/.config/opencode/opencode.jsonc"
{
  "plugins": ["/Users/you/personal/opencode-mpl"],
}
```

Or from Git, because `dist/` is committed:

```sh
opencode plugin add github:HT2Knock/opencode-mpl#v0.1.0
```

Requires OpenCode `>=2.3.2 <2.4.0` and Node `>=22` for development.

## Options

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

- `outputDir`: where charts are written. Default
  `~/.local/share/opencode/mpl/charts/<YYYY-MM-DD>/`. A relative path resolves
  against the session location.

## Use

In a Code Mode session:

```js
const r = await tools.mpl.render({
  calls: [
    [
      "bar",
      [
        ["api", "web", "worker"],
        [120, 85, 42],
      ],
      { color: "C0" },
    ],
    ["set_title", ["Requests per second"]],
    ["set_ylabel", ["req/s"]],
  ],
  name: "requests",
});
return r.pngPath;
```

The transcript draws the image when `session.image_preview` is on. The reply
always carries the saved path, so it works without the preview too.

## Theme

A `./tui` part reads the active OpenCode theme and sends its palette to the
server over RPC. The renderer maps `background.base`, `text.base`, `text.muted`,
`border.base`, and the `categorical` hues (step 400 on dark, 600 on light) into
an mpl style. `C0`..`C7` follow the theme.

When no palette has arrived, for example in `opencode run`, the plugin reads
`theme.mode` from `~/.config/opencode/cli.json` and uses `pro-slate` for light
and `pro-dark` for dark. `system` counts as dark.

A `theme` in the tool input selects a bundled mpl style (`pro-dark`,
`pro-slate`, any matplotlib style) and overrides the palette.

## Layout

| Path               | Purpose                                               |
| ------------------ | ----------------------------------------------------- |
| `src/index.ts`     | Plugin part: tool, skill, palette RPC                 |
| `src/render.ts`    | Spec to PNG/SVG files                                 |
| `src/replay.ts`    | Spec replay with the Axes/Figure allow-list           |
| `src/palette.ts`   | Theme tokens to `.mplstyle`, fallback from `cli.json` |
| `src/rpc.ts`       | Palette bridge contract                               |
| `src/tui.ts`       | TUI part: pushes the theme palette                    |
| `src/skill.ts`     | `mpl-charts` skill text                               |
| `scripts/build.ts` | esbuild bundle into `dist/`                           |
| `test/`            | bun tests                                             |

## Development

`mpl` is not on npm and builds `dist/` in a `prepare` script. Bun blocks that
script, so install with npm:

```sh
npm run setup      # npm install; builds mpl from github:ivarvong/mpl
bun run check      # typecheck and tests
bun run build      # rebuild dist/
```

`dist/` is committed because OpenCode loads the plugin from Git without a build
step. Run `bun run build` after a source change.

## License

MIT for this plugin. The bundle includes mpl (ISC) and its fonts and style
tables; see `THIRD_PARTY_NOTICES.md`.
