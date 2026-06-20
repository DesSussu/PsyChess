"use client";

import { useState, useCallback } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

/**
 * Tablero — envoltorio de react-chessboard (v5) + chess.js.
 *
 * chess.js = el ÁRBITRO: valida reglas, sabe de jaques, jaque mate, turnos.
 * react-chessboard = la INTERFAZ: dibuja el tablero y maneja el drag-and-drop.
 *
 * Regla de oro: la UI NUNCA decide si una jugada es legal. Eso lo dice chess.js.
 */
export default function Tablero() {
  // Guardamos la instancia de Chess en estado. Cada jugada crea una nueva
  // instancia para que React detecte el cambio y vuelva a renderizar.
  const [game, setGame] = useState(() => new Chess());
  const [fen, setFen] = useState(game.fen());

  const onPieceDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      if (!targetSquare) return false;

      // Clonamos el estado actual y probamos la jugada.
      const next = new Chess(game.fen());
      try {
        const move = next.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q", // TODO: dejar elegir pieza de promoción
        });
        if (!move) return false; // jugada ilegal → la pieza vuelve sola
      } catch {
        return false; // chess.js tira si la jugada es inválida
      }

      setGame(next);
      setFen(next.fen());

      // TODO: acá medimos el tiempo de la jugada (detección de tilt)
      // TODO: acá pedimos a Maia su respuesta vía /api/maia

      return true; // jugada aceptada
    },
    [game]
  );

  return (
    <div className="w-full max-w-[480px]">
      <Chessboard options={{ position: fen, onPieceDrop }} />
    </div>
  );
}
