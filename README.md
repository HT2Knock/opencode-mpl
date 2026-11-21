# opencode-mpl

Charts inside OpenCode, drawn by [mpl](https://github.com/ivarvong/mpl), a pure
JavaScript reimplementation of matplotlib 3.11. The model writes a figure spec,
the plugin replays the matplotlib calls, and you get a PNG or an SVG file plus
the image in the conversation.

The plugin ports
[Dillon Mulroy's Pi extension](https://github.com/dmmulroy/.dotfiles/tree/main/home/.pi/agent/extensions/mpl)
to the OpenCode 2 plugin API. It runs no Python and no browser.

## Install

Use a local checkout:

```jsonc title="~/.config/opencode/opencode.jsonc"
{ "plugins": ["/Users/you/personal/opencode-mpl"] }
```

Or install the tagged build from GitHub. `dist/` is committed, so the install
runs no build step:

```sh
opencode plugin add github:HT2Knock/opencode-mpl#v0.2.0
```

The plugin requires OpenCode 2.3.2 or newer, and older than 2.4.0.

## Draw a chart

Ask for a chart, or call the tool inside Code Mode:

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

The spec follows matplotlib's object API. Read the `mpl-charts` skill for the
call list, date handling, and the common mistakes. The tool writes the file and
returns the image and the paths. To see the image in the transcript, turn on
`session.image_preview` in the CLI settings.

## Theme

Charts use the colors of the active OpenCode theme. The TUI part writes the
palette, and the renderer reads it at each call. Without a palette, the plugin
uses a bundled dark or light style based on `theme.mode` in your CLI settings.
Read [how the theme reaches a chart](docs/theme.md).

## Reference

[tool, options, files, and errors](docs/reference.md).

## Development

`mpl` is not on npm and builds its `dist/` in a `prepare` script. Bun blocks
that script, so install with npm.

```sh
npm run setup
bun run check
bun run build
```

`bun run eval` runs the agent eval: six chart tasks against two models, scored
from the figure each run drew.

Commit `dist/` with every source change. OpenCode loads the plugin from Git
without a build step.

## License

MIT. The bundle includes mpl (ISC) and its fonts and style tables. Read
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
