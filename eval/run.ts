#!/usr/bin/env bun
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { factsFromSpec } from "./scene";
import { tasks, type Task } from "./tasks";
import { transcriptFacts } from "./transcript";

const PLUGIN = resolve(import.meta.dir, "..");
const RUN_ROOT = join(tmpdir(), "opencode-mpl-eval");
const RESULTS = join(import.meta.dir, "results");
const DEFAULT_MODELS = ["opencode-go/deepseek-v4.1-flash", "github-copilot/claude-sonnet-5"];
const TIMEOUT_MS = 300_000;
const DATA_HOME = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
const CHARTS = join(DATA_HOME, "opencode", "mpl", "charts");

interface Row {
  readonly task: string;
  readonly model: string;
  readonly ok: boolean;
  readonly reasons: readonly string[];
  readonly renders: number;
  readonly attempts: number;
  readonly errors: number;
  readonly theme: string;
  readonly seconds: number;
  readonly png: string | null;
}

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function list<T>(value: string | undefined, fallback: readonly T[]): readonly T[] {
  return value ? (value.split(",").map((s) => s.trim()).filter(Boolean) as unknown as T[]) : fallback;
}

function chartFiles(): string[] {
  try {
    return readdirSync(CHARTS, { recursive: true })
      .map((name) => join(CHARTS, String(name)))
      .filter((path) => statSync(path).isFile());
  } catch {
    return [];
  }
}

async function runOne(task: Task, model: string): Promise<Row> {
  const slug = `${task.id}-${model.replace(/[^a-z0-9]+/gi, "_")}`;
  const runDir = join(RUN_ROOT, slug);
  mkdirSync(runDir, { recursive: true });
  const before = new Set(chartFiles());
  writeFileSync(
    join(runDir, "opencode.jsonc"),
    JSON.stringify({ $schema: "https://opencode.ai/config.json", plugins: [PLUGIN] }, null, 2),
  );

  const started = Date.now();
  const proc = Bun.spawn(
    ["opencode", "run", "--format", "json", "--auto", "--archived", "--title", `eval ${task.id}`, "--model", model, task.prompt],
    { cwd: runDir, stdout: "pipe", stderr: "pipe" },
  );
  const timer = setTimeout(() => proc.kill("SIGKILL"), TIMEOUT_MS);
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  await proc.exited;
  clearTimeout(timer);

  const transcript = `${stdout}\n${stderr}`;
  writeFileSync(join(runDir, "transcript.jsonl"), transcript);

  const newSidecars = chartFiles()
    .filter((path) => path.endsWith(".json") && !before.has(path))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  const { attempts, errors } = transcriptFacts(transcript);
  const seconds = Math.round((Date.now() - started) / 1000);

  if (newSidecars.length === 0) {
    return {
      task: task.id,
      model,
      ok: false,
      reasons: ["no chart was rendered"],
      renders: 0,
      attempts,
      errors,
      theme: "",
      seconds,
      png: null,
    };
  }

  const sidecar = JSON.parse(readFileSync(newSidecars[0]!, "utf8")) as {
    spec: Parameters<typeof factsFromSpec>[0];
    resolvedTheme: string;
    pngPath?: string;
    svgPath?: string;
  };
  const artifacts = join(runDir, "artifacts");
  mkdirSync(artifacts, { recursive: true });
  copyFileSync(newSidecars[0]!, join(artifacts, "spec.json"));
  if (sidecar.pngPath) copyFileSync(sidecar.pngPath, join(artifacts, "chart.png"));
  for (const path of newSidecars) {
    const entry = JSON.parse(readFileSync(path, "utf8")) as { pngPath?: string; svgPath?: string };
    for (const file of [path, entry.pngPath, entry.svgPath]) {
      if (file && file.startsWith(CHARTS)) rmSync(file, { force: true });
    }
  }
  const facts = factsFromSpec(sidecar.spec, sidecar.resolvedTheme);
  const reasons = task.check(facts, { renders: newSidecars.length, errors, transcript });
  return {
    task: task.id,
    model,
    ok: reasons.length === 0,
    reasons,
    renders: newSidecars.length,
    attempts,
    errors,
    theme: sidecar.resolvedTheme,
    seconds,
    png: sidecar.pngPath ?? null,
  };
}

const models = list(flag("models"), DEFAULT_MODELS);
const selected = list(flag("tasks"), tasks.map((task) => task.id));
const rows: Row[] = [];

for (const model of models) {
  for (const task of tasks.filter((task) => selected.includes(task.id))) {
    process.stdout.write(`${task.id} with ${model} ... `);
    const row = await runOne(task, model);
    rows.push(row);
    console.log(
      row.ok
        ? `pass (${row.renders} renders, ${row.attempts} attempts, ${row.errors} errors, ${row.seconds}s)`
        : `FAIL: ${row.reasons.join("; ")}`,
    );
  }
}

mkdirSync(RESULTS, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
writeFileSync(join(RESULTS, `run-${stamp}.json`), JSON.stringify(rows, null, 2));

console.log("");
for (const row of rows) {
  console.log(
    `${row.ok ? "pass" : "FAIL"}  ${row.task.padEnd(18)} ${row.model.padEnd(38)} renders=${row.renders} attempts=${row.attempts} errors=${row.errors} theme=${row.theme || "-"} ${row.seconds}s`,
  );
}
const passed = rows.filter((row) => row.ok).length;
console.log(`\n${passed}/${rows.length} passed`);
