interface ToolCall {
  readonly tool: string;
  readonly status: string;
}

interface TranscriptEvent {
  readonly type?: string;
  readonly part?: {
    readonly tool?: string;
    readonly state?: {
      readonly metadata?: {
        readonly toolCalls?: readonly ToolCall[];
        readonly metadata?: { readonly toolCalls?: readonly ToolCall[] };
      };
    };
  };
}

export function transcriptFacts(transcript: string): { attempts: number; errors: number } {
  let attempts = 0;
  let errors = 0;
  for (const line of transcript.split("\n")) {
    if (!line.startsWith("{")) continue;
    let event: TranscriptEvent;
    try {
      event = JSON.parse(line) as TranscriptEvent;
    } catch {
      continue;
    }
    if (event.type !== "tool_use" || event.part?.tool !== "execute") continue;
    const metadata = event.part.state?.metadata;
    const calls = metadata?.metadata?.toolCalls ?? metadata?.toolCalls ?? [];
    for (const call of calls) {
      if (call.tool !== "mpl.render") continue;
      attempts += 1;
      if (call.status === "error") errors += 1;
    }
  }
  return { attempts, errors };
}
