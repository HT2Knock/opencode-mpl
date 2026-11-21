# How the theme reaches a chart

A server plugin cannot read the OpenCode theme. The theme belongs to the
terminal client. OpenCode stores the selection in `~/.config/opencode/cli.json`,
and the TUI resolves it into colors that only the TUI process holds.

The first design sent the palette from the TUI part to the server part over RPC.
That design cannot work. The server RPC registry is per location, and OpenCode
creates the location when a session runs. A call during TUI startup returns
`rpc.unavailable`, and retrying does not help while the session is idle.

The plugin uses a file instead. The TUI part writes
`~/.local/share/opencode/mpl/palette.json` once per load, and the renderer reads
the file at each call. Charts do not depend on the TUI process still running,
and `opencode run` sessions get the same palette.

## What the palette changes

The renderer turns the palette into a matplotlib style. The layout keys match
the bundled pro styles, so only the colors change.

| Style key                                                 | Theme token       |
| --------------------------------------------------------- | ----------------- |
| `figure.facecolor`, `axes.facecolor`                      | `background.base` |
| `text.color`, `axes.titlecolor`                           | `text.base`       |
| `axes.labelcolor`, `xtick.labelcolor`, `ytick.labelcolor` | `text.muted`      |
| `grid.color`, `axes.edgecolor`                            | `border.base`     |
| `axes.prop_cycle`                                         | `categorical`     |

Series colors are the theme's categorical hues, in order. The renderer takes
step 400 from each hue scale for a dark theme and step 600 for a light theme,
because the step numbers run from the lightest to the darkest color in the
scale. Thus `C0` and `C1` follow the theme, and a chart made in a dark theme
stays readable in that theme.

## Limits

- A theme change reaches a chart after the next TUI start. The TUI part runs at
  load, and OpenCode gives it no theme-change event.
- The palette is one file per user, so every project shares it.
- Backgrounds stay opaque. A transparent PNG looks right in the transcript and
  wrong in a saved file or a slide.
- A `theme` input overrides the palette for one call. Use it when a chart must
  match an external document.
- When no palette exists, the plugin reads `theme.mode` from the CLI settings.
  The value `system` cannot be resolved outside the TUI, so it counts as dark.
