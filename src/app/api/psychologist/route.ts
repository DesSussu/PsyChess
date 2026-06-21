import { NextResponse } from "next/server";
import { searchChessBooks } from "@/lib/chess-books";

const NAN_URL         = process.env.NAN_BASE_URL        ?? "https://api.nan.builders/v1/chat/completions";
const NAN_KEY         = process.env.NAN_API_KEY         ?? "";
const AI_MODEL        = process.env.AI_MODEL             ?? "deepseek-v4-flash";
const AI_VISION_MODEL = process.env.AI_VISION_MODEL      ?? "mimo-v2.5";

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
    fen: string;
  }>;
  boardImage?: string;
};

export async function POST(request: Request) {
  const { moveHistory, boardImage }: RequestBody = await request.json();

  const lastMoves  = moveHistory.slice(-8);
  const lastHuman  = [...moveHistory].reverse().find(m => m.player === "human");
  const movedFast  = lastHuman ? lastHuman.thinkingTimeMs < 2_000 : false;

  const userMessage = `
Posición actual del tablero (FEN): ${lastHuman?.fen ?? "posición desconocida"}

Historial de jugadas (últimas ${lastMoves.length}):
${lastMoves.map(m =>
  m.player === "human"
    ? `Jugador: ${m.san} (${(m.thinkingTimeMs / 1000).toFixed(1)}s${m.isTilt ? " — MUY RÁPIDO" : ""})`
    : `Maia (rival): ${m.san}`
).join("\n")}

Última jugada del jugador: ${lastHuman?.san ?? "—"} en ${((lastHuman?.thinkingTimeMs ?? 0) / 1000).toFixed(1)} segundos.
${movedFast ? "Movió muy rápido. Advertirle y darle una pista de lo que debería pensar." : "Tomó su tiempo. Analizar la jugada brevemente."}

Responde en español:`.trim();

  const bookContext = await searchChessBooks(`${lastHuman?.san ?? ""} ${lastHuman?.fen ?? ""}`);
  const systemContent = bookContext
    ? `${SYSTEM_PROMPT}\n\nContexto de libros de ajedrez:\n${bookContext}`
    : SYSTEM_PROMPT;

  const userContent = boardImage
    ? [
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${boardImage}` } },
        { type: "text",      text: userMessage },
      ]
    : userMessage;

  let aiResponse: Response;
  try {
    aiResponse = await fetch(NAN_URL, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${NAN_KEY}`,
      },
      body: JSON.stringify({
        model: boardImage ? AI_VISION_MODEL : AI_MODEL,
        messages: [
          { role: "system", content: systemContent },
          { role: "user",   content: userContent },
        ],
        stream: true,
        temperature: 0.7,
        ...(!boardImage ? { reasoning_effort: "medium" } : {}),
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[psychologist] Failed to reach NaN Builders:", message);
    return NextResponse.json(
      { error: `Could not connect to NaN Builders: ${message}` },
      { status: 502 }
    );
  }

  if (!aiResponse.ok) {
    const body = await aiResponse.text();
    console.error("[psychologist] NaN Builders returned error:", aiResponse.status, body);
    return NextResponse.json(
      { error: `NaN Builders responded with ${aiResponse.status}: ${body}` },
      { status: 502 }
    );
  }

  return new Response(aiResponse.body, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}
