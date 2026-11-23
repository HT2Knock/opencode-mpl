import { expect, test } from "bun:test";
import { transcriptFacts } from "../eval/transcript";

const event = (tool: string, status: string, nested: boolean): string =>
  JSON.stringify({
    type: "tool_use",
    part: {
      tool: "execute",
      state: { metadata: nested ? { metadata: { toolCalls: [{ tool, status }] } } : { toolCalls: [{ tool, status }] } },
    },
  });

test("failed render calls count even when a JSON quote is escaped", () => {
  const transcript = [
    event("mpl.render", "completed", true),
    event("mpl.render", "error", true),
    event("other.tool", "error", true),
    "not json",
  ].join("\n");
  expect(transcriptFacts(transcript)).toEqual({ attempts: 2, errors: 1 });
});

test("the direct metadata shape counts too", () => {
  expect(transcriptFacts(event("mpl.render", "error", false))).toEqual({ attempts: 1, errors: 1 });
});

test("a transcript without render calls reports zero", () => {
  expect(transcriptFacts("")).toEqual({ attempts: 0, errors: 0 });
});
