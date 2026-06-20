import type { MoveRecord } from "@/types/game";

/**
 * Calls /api/psychologist and yields the response text token by token.
 *
 * LM Studio streams the response in OpenAI's SSE format:
 *   data: {"choices":[{"delta":{"content":"Hello"}}]}
 *   data: [DONE]
 *
 * DeepSeek-R1 wraps its reasoning inside <think>...</think> before the final answer.
 * We yield ALL tokens here — the component decides what to show.
 */
export async function* streamPsychologistResponse(
  moveHistory: MoveRecord[]
): AsyncGenerator<string> {
  const response = await fetch("/api/psychologist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ moveHistory }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Psychologist API responded with ${response.status}`);
  }

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();

  // Chunks arrive mid-line — we buffer incomplete data until we have a full line.
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Split on newlines. The last element may be an incomplete line — keep it in the buffer.
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;

      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return;

      try {
        const parsed = JSON.parse(payload);
        const delta = parsed?.choices?.[0]?.delta;
        if (delta?.content) yield delta.content;
      } catch {
        // Skip malformed lines.
      }
    }
  }
}
