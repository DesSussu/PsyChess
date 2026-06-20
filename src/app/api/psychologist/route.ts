/**
 * POST /api/psychologist
 *
 * Sends the game context to DeepSeek-R1 running in LM Studio and streams
 * the response back to the client using Server-Sent Events (SSE).
 *
 * LM Studio exposes an OpenAI-compatible API at http://localhost:1234.
 * We forward the request there and pipe the stream directly to the browser.
 *
 * DeepSeek-R1 wraps its internal reasoning inside <think>...</think> tags.
 * The client is responsible for hiding that part and showing only the final response.
 */

import { NextResponse } from "next/server";

const LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions";

const SYSTEM_PROMPT = `Eres un entrenador de ajedrez experto que analiza las partidas de un jugador principiante/intermedio en tiempo real.

Tu rol:
- Analizar la última jugada del jugador: decir si fue buena, mala o correcta y explicar brevemente por qué.
- Si el jugador movió muy rápido (menos de 2 segundos), advertirle que frene y darle UNA pista concreta de lo que debería estar pensando antes de mover (estructura de peones, rey expuesto, pieza sin defender, etc). No le digas la jugada correcta, solo la idea.
- Si el jugador tomó su tiempo, reconocerlo brevemente.
- Respuestas cortas y directas. Máximo 3 frases. Sin tecnicismos innecesarios.
- Responder SIEMPRE en español.`;

type RequestBody = {
  moveHistory: Array<{
    san: string;
    player: string;
    thinkingTimeMs: number;
    isTilt: boolean;
  }>;
};

export async function POST(request: Request) {
  const { moveHistory }: RequestBody = await request.json();

  const lastMoves   = moveHistory.slice(-8);
  const lastHuman   = [...moveHistory].reverse().find(m => m.player === "human");
  const movedFast   = lastHuman ? lastHuman.thinkingTimeMs < 2_000 : false;

  const userMessage = `
Historial de jugadas (últimas ${lastMoves.length}):
${lastMoves.map(m =>
  m.player === "human"
    ? `Jugador: ${m.san} (${(m.thinkingTimeMs / 1000).toFixed(1)}s${m.isTilt ? " — MUY RÁPIDO" : ""})`
    : `Maia (rival): ${m.san}`
).join("\n")}

Última jugada del jugador: ${lastHuman?.san ?? "—"} en ${((lastHuman?.thinkingTimeMs ?? 0) / 1000).toFixed(1)} segundos.
${movedFast ? "Movió muy rápido. Advertirle y darle una pista de lo que debería pensar." : "Tomó su tiempo. Analizar la jugada brevemente."}

Responde en español:`.trim();

  let lmStudioResponse: Response;
  try {
    lmStudioResponse = await fetch(LM_STUDIO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "deepseek-r1",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user",   content: userMessage },
        ],
        stream: true,
        temperature: 0.7,
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[psychologist] Failed to reach LM Studio:", message);
    return NextResponse.json(
      { error: `Could not connect to LM Studio: ${message}` },
      { status: 502 }
    );
  }

  if (!lmStudioResponse.ok) {
    const body = await lmStudioResponse.text();
    console.error("[psychologist] LM Studio returned error:", lmStudioResponse.status, body);
    return NextResponse.json(
      { error: `LM Studio responded with ${lmStudioResponse.status}: ${body}` },
      { status: 502 }
    );
  }

  // Pipe the stream from LM Studio directly to the browser.
  return new Response(lmStudioResponse.body, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}
