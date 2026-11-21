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

## Style

- Two spaces, double quotes, semicolons.
- TypeScript strict, no `any` without a comment that names the boundary.
