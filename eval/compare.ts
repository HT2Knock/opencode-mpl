#!/usr/bin/env bun
import { readFileSync } from "node:fs";

interface Row {
  readonly task: string;
  readonly model: string;
  readonly ok: boolean;
  readonly renders: number;
  readonly errors: number;
  readonly seconds: number;
}

function load(path: string): Map<string, Row> {
  const rows = JSON.parse(readFileSync(path, "utf8")) as Row[];
  return new Map(rows.map((row) => [`${row.task}|${row.model}`, row]));
}

const [before, after] = process.argv.slice(2);
if (!before || !after) {
  console.error("usage: bun eval/compare.ts <before.json> <after.json>");
  process.exit(2);
}

const left = load(before);
const right = load(after);
const keys = [...new Set([...left.keys(), ...right.keys()])].sort();

console.log("task               model                      before            after");
for (const key of keys) {
  const a = left.get(key);
  const b = right.get(key);
  const [task, model] = key.split("|");
  const format = (row: Row | undefined) =>
    row ? `${row.ok ? "pass" : "FAIL"} r=${row.renders} e=${row.errors} ${row.seconds}s` : "-";
  console.log(`${task!.padEnd(18)} ${model!.padEnd(26)} ${format(a).padEnd(17)} ${format(b)}`);
}

const summarize = (rows: Map<string, Row>) => {
  const all = [...rows.values()];
  const passes = all.filter((row) => row.ok).length;
  const renders = all.reduce((sum, row) => sum + row.renders, 0);
  return `${passes}/${all.length} pass, ${renders} renders`;
};

console.log(`\nbefore: ${summarize(left)}\nafter:  ${summarize(right)}`);
