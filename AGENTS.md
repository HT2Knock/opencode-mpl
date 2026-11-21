# Agent rules

## Build

- `npm run setup` installs dependencies. Use npm, not Bun: `mpl` builds `dist/`
  in a `prepare` script and Bun blocks it.
- `bun run check` runs the typecheck and the tests.
- `bun run build` rebuilds `dist/`. Commit `dist/` with every source change,
  because OpenCode loads the plugin from Git without a build step.

## Rules

- `src/replay.ts` and `src/render.ts` follow the Pi extension. Keep behaviour
  identical unless a change is stated in the README.
- The spec is untrusted input. Every call goes through the Axes/Figure
  allow-list. Do not add a method that touches the filesystem, the network, or
  process state.
- Unknown theme names, kwargs, and scales throw. The message names the call
  index.
- Tests use `bun test`. A render test must read the PNG magic and the IHDR size,
  not only the file length.
- Prove a change on the real harness: `bun run build`, then a Code Mode
  `execute` call that renders a chart. A passing test is not proof that the
  plugin loaded.

## Eval

- `bun eval/run.ts` runs the agent tasks against the built `dist/`. Run `bun run build` first.
- The eval reads the spec sidecar, not the reply. A task passes only when the figure passes
  the scene checks.
- Keep `dist/` unchanged while a baseline runs, or the results mix builds.
- Write results under `eval/results/` and compare two runs by task and model, not by the total.

## Docs

- `README.md` is a landing page: what the plugin is, install, one example, links.
- `docs/reference.md` holds the tool fields, options, files, and errors. Keep it dry.
- `docs/theme.md` explains why the palette travels through a file. Keep opinion there only.
- Apply the technical writing rules to every document. No em dashes, no slashes
  between alternatives, sentence case headings.

## Style

- Two spaces, double quotes, semicolons.
- TypeScript strict, no `any` without a comment that names the boundary.
