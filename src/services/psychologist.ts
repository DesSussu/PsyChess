import type { MoveRecord } from "@/types/game";

export async function* streamPsychologistResponse(
  moveHistory: MoveRecord[],
  boardImage?: string
): AsyncGenerator<string> {
  const response = await fetch("/api/psychologist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ moveHistory, ...(boardImage ? { boardImage } : {}) }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Psychologist API responded with ${response.status}`);
  }

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

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
