import { afterAll, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MPL_THEMES, renderChart, toToolReply } from "../src/render";
import type { Palette } from "../src/palette";

const outDir = mkdtempSync(join(tmpdir(), "opencode-mpl-test-"));
afterAll(() => rmSync(outDir, { recursive: true, force: true }));

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

const palette: Palette = {
  mode: "dark",
  background: "#1a1b26",
  text: "#c0caf5",
  muted: "#565f89",
  border: "#2f3549",
  categorical: ["#7aa2f7", "#bb9af7", "#9ece6a"],
};

test("the bundled themes include pro-slate and pro-dark", () => {
  for (const name of ["pro-slate", "pro-dark"]) expect(MPL_THEMES.includes(name)).toBe(true);
});

for (const theme of ["pro-slate", "pro-dark"]) {
  test(`renders a grid with dates in ${theme}`, () => {
    const days = ["2026-10-01", "2026-10-02", "2026-10-03"];
    const out = renderChart(
      {
        theme,
        name: theme,
        format: "both",
        grid: { rows: 1, cols: 2, width_ratios: [2, 1] },
        calls: [
          ["plot", [{ $dates: days }, [1, 3, 2]], { label: "a" }],
          ["$concise_x", []],
          ["legend", []],
          ["sca", [1]],
          ["bar", [["x", "y"], [2, 1]]],
          ["fig.suptitle", ["t"]],
        ],
      },
      { outDir },
    );
    expect([...(out.png ?? []).slice(0, 4)]).toEqual(PNG_MAGIC);
    expect(out.width).toBe(1440);
    expect(out.height).toBe(840);
    expect(out.pngPath && existsSync(out.pngPath)).toBe(true);
    expect(out.svgPath && readFileSync(out.svgPath, "utf8").includes("<svg")).toBe(true);
  });
}

test("a stored palette themes the figure without a theme input", () => {
  const out = renderChart({ calls: [["plot", [[1, 2, 3], [3, 1, 2]]]] }, { outDir, palette });
  expect(out.theme).toBe("opencode-dark");
  expect([...(out.png ?? []).slice(0, 4)]).toEqual(PNG_MAGIC);
});

test("a theme input wins over the palette", () => {
  const out = renderChart({ theme: "pro-slate", calls: [["plot", [[1, 2], [2, 1]]]] }, { outDir, palette });
  expect(out.theme).toBe("pro-slate");
});

test("two palettes give different pixels", () => {
  const calls = [["bar", [["a", "b"], [3, 7]]]] as const;
  const light: Palette = { ...palette, mode: "light", background: "#fbfbfd", text: "#1f2233", muted: "#6b7085", border: "#c9ccd8" };
  const a = renderChart({ calls }, { outDir, palette });
  const b = renderChart({ calls }, { outDir, palette: light });
  expect(Buffer.compare(Buffer.from(a.png ?? []), Buffer.from(b.png ?? []))).not.toBe(0);
});

test("format svg writes only the SVG", () => {
  const out = renderChart({ calls: [["plot", [[1, 2], [2, 1]]]], format: "svg" }, { outDir });
  expect(out.pngPath).toBeUndefined();
  expect(out.svgPath && existsSync(out.svgPath)).toBe(true);
});

test("the fallback theme is pro-dark when no palette or theme is set", () => {
  expect(renderChart({ calls: [["plot", [[1], [1]]]] }, { outDir }).theme).toBe("pro-dark");
});

test("the tool reply carries the paths and the PNG image", () => {
  const out = renderChart({ name: "reply", calls: [["plot", [[1, 2], [2, 1]]]] }, { outDir });
  const reply = toToolReply(out);
  expect(reply.text).toContain(out.pngPath ?? "");
  expect(reply.image?.mime).toBe("image/png");
  expect(reply.image?.name).toBe(out.pngPath?.split("/").pop() ?? "");
  expect(reply.image?.uri.startsWith("data:image/png;base64,")).toBe(true);
});

test("a render writes a spec sidecar that replays", () => {
  const out = renderChart({ name: "sidecar", theme: "pro-slate", calls: [["plot", [[1, 2], [2, 1]]]] }, { outDir });
  expect(out.specPath && existsSync(out.specPath)).toBe(true);
  const sidecar = JSON.parse(readFileSync(out.specPath ?? "", "utf8"));
  expect(sidecar.spec.calls[0][0]).toBe("plot");
  expect(sidecar.resolvedTheme).toBe("pro-slate");
});

test("an SVG-only reply has paths and no image", () => {
  const out = renderChart({ calls: [["plot", [[1, 2], [2, 1]]]], format: "svg" }, { outDir });
  const reply = toToolReply(out);
  expect(reply.text).toContain(out.svgPath ?? "");
  expect(reply.image).toBeUndefined();
});

test("a bad argument reports the call index", () => {
  expect(() => renderChart({ calls: [["plot", [{ $dates: "x" }, [1]]]] }, { outDir })).toThrow(
    /calls\[0\] plot: \$dates expects an array/,
  );
  expect(() => renderChart({ calls: [["sca", [9]]] }, { outDir })).toThrow(/calls\[0\] sca: no Axes 9/);
});

test("a positional width renders", () => {
  const out = renderChart({ calls: [["bar", [["a", "b"], [3, 7], 0.72]]] }, { outDir });
  expect([...(out.png ?? []).slice(0, 4)]).toEqual(PNG_MAGIC);
});

test("arguments mpl does not take are reported with the call index", () => {
  expect(() => renderChart({ calls: [["bar", [["a", "b"], [3, 7], 0.72, [0, 0], 5]]] }, { outDir })).toThrow(
    /calls\[0\] bar: bar\(\) takes at most 2 optional positional arguments \(width, bottom\) and one keyword object/,
  );
  expect(() => renderChart({ calls: [["legend", [["a"]]]] }, { outDir })).toThrow(
    /calls\[0\] legend: legend\(\) keyword arguments must be a plain object/,
  );
});

test("unknown methods and kwargs are reported with the call index", () => {
  expect(() => renderChart({ calls: [["plot", [[1], [1]]], ["violinplot", [[1]]]] }, { outDir })).toThrow(/calls\[1\] violinplot: unknown call/);
  expect(() => renderChart({ calls: [["plot", [[1], [1]], { linewdith: 2 }]] }, { outDir })).toThrow(/calls\[0\] plot: .*linewdith/);
  expect(() => renderChart({ theme: "nope", calls: [] }, { outDir })).toThrow(/unknown theme/);
  expect(() => renderChart({ scale: 10, calls: [] }, { outDir })).toThrow(/scale must be between/);
  const unwrapped = ["bar", ["a", "b"], [3, 7]] as never;
  expect(() => renderChart({ calls: [unwrapped] }, { outDir })).toThrow(/wrap all positional args in one array/);
});

test("the default directory is dated under the OpenCode data dir", () => {
  const out = renderChart({ name: "dated", calls: [["plot", [[1], [1]]]] });
  expect(out.pngPath).toMatch(/opencode\/mpl\/charts\/\d{4}-\d{2}-\d{2}\/dated-\d{6}\.png$/);
  if (out.pngPath) rmSync(out.pngPath, { force: true });
});
