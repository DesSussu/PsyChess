import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";

const ENGINE = path.join(process.cwd(), "engines", "lc0.exe");
const WEIGHTS = path.join(process.cwd(), "engines", "maia-1100.pb.gz");
const TIMEOUT_MS = 10_000;

/**
 * Lanza Lc0, hace el handshake UCI y devuelve la jugada de Maia para la posición dada.
 *
 * Protocolo UCI resumido:
 *   Nosotros  →  "uci"
 *   Lc0       →  ... "uciok"
 *   Nosotros  →  "position fen <fen>"  +  "go nodes 1"
 *   Lc0       →  ... "bestmove <jugada>"
 */
function askMaia(fen: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const lc0 = spawn(ENGINE, [`--weights=${WEIGHTS}`]);

    let stdout = "";
    let handshakeDone = false;

    const timeout = setTimeout(() => {
      lc0.kill();
      reject(new Error("Lc0 no respondió en 10 segundos"));
    }, TIMEOUT_MS);

    lc0.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();

      // Paso 1: Lc0 confirmó que está listo → mandamos la posición.
      if (!handshakeDone && stdout.includes("uciok")) {
        handshakeDone = true;
        lc0.stdin.write(`position fen ${fen}\ngo nodes 1\n`);
      }

      // Paso 2: Lc0 terminó de calcular → extraemos la jugada y cerramos.
      const match = stdout.match(/bestmove\s+(\S+)/);
      if (match) {
        clearTimeout(timeout);
        lc0.kill();
        resolve(match[1]);
      }
    });

    lc0.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    // Damos inicio al handshake.
    lc0.stdin.write("uci\n");
  });
}

export async function POST(request: Request) {
  const { fen } = await request.json();

  if (typeof fen !== "string" || !fen) {
    return NextResponse.json({ error: "FEN inválido" }, { status: 400 });
  }

  try {
    const bestMove = await askMaia(fen);
    return NextResponse.json({ bestMove });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
