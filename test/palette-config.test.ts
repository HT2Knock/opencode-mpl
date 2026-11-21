import { afterAll, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cliSettingsPath, fallbackStyle } from "../src/palette";

const home = mkdtempSync(join(tmpdir(), "opencode-mpl-home-"));
afterAll(() => rmSync(home, { recursive: true, force: true }));

test("a light theme mode selects pro-slate", () => {
  const env = { ...process.env, XDG_CONFIG_HOME: home };
  mkdirSync(join(home, "opencode"), { recursive: true });
  writeFileSync(cliSettingsPath(env), JSON.stringify({ theme: { name: "tokyonight", mode: "light" } }));
  expect(fallbackStyle(env)).toBe("pro-slate");
});

test("a dark theme mode selects pro-dark", () => {
  const env = { ...process.env, XDG_CONFIG_HOME: home };
  writeFileSync(cliSettingsPath(env), JSON.stringify({ theme: { name: "tokyonight", mode: "dark" } }));
  expect(fallbackStyle(env)).toBe("pro-dark");
});

test("system and a missing file fall back to pro-dark", () => {
  const env = { ...process.env, XDG_CONFIG_HOME: home };
  writeFileSync(cliSettingsPath(env), JSON.stringify({ theme: { name: "opencode", mode: "system" } }));
  expect(fallbackStyle(env)).toBe("pro-dark");
  const empty = join(home, "missing");
  expect(fallbackStyle({ ...process.env, XDG_CONFIG_HOME: empty })).toBe("pro-dark");
});
