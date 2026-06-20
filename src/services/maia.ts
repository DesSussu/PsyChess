/**
 * services/maia.ts — cliente HTTP hacia nuestro propio backend.
 *
 * Los componentes del cliente NO hablan directo con Lc0/Maia ni con DeepSeek.
 * Hablan con NUESTRAS rutas /api (que corren en el servidor de Next.js),
 * y esas rutas son las que ejecutan los motores locales (.exe / LM Studio).
 *
 * ¿Por qué esta capa? Para no acoplar la UI a los detalles del backend.
 * Si mañana cambiamos Lc0 por otro motor, solo tocamos /api, no los componentes.
 */

export interface MaiaMoveRequest {
  /** Posición actual en notación FEN. */
  fen: string;
}

export interface MaiaMoveResponse {
  /** Jugada sugerida por Maia en formato UCI, ej: "e2e4". */
  bestMove: string;
}

/** Pide a Maia su jugada para una posición dada. */
export async function pedirJugadaMaia(
  fen: string
): Promise<MaiaMoveResponse> {
  const res = await fetch("/api/maia", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fen } satisfies MaiaMoveRequest),
  });

  if (!res.ok) {
    throw new Error(`Maia respondió ${res.status}`);
  }

  return res.json();
}
