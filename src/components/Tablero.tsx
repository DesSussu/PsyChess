"use client";

import { useState, useCallback, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { pedirJugadaMaia } from "@/services/maia";
import { TILT_THRESHOLD_MS, type MoveRecord } from "@/types/game";

/**
 * Tablero — the chess board component.
 *
 * Two libraries work together here:
 *   chess.js         → the REFEREE: knows all chess rules, validates moves, detects checkmate.
 *   react-chessboard → the INTERFACE: renders the board and handles drag & drop.
 *
 * Golden rule: the UI never decides if a move is legal. Only chess.js does that.
 *
 * Move flow:
 *   1. Player drags a piece (white).
 *   2. chess.js validates the move is legal.
 *   3. We record how long the player took to move (tilt detection).
 *   4. We ask Maia for a response via /api/maia.
 *   5. We apply Maia's move (black) to the board and reset the player's clock.
 */

type TableroProps = {
  onMoveRecorded: (move: MoveRecord) => void;
};

// Maia returns moves in UCI format: "e2e4" or "e7e8q" (pawn promotion).
// This helper breaks that string into the parts that chess.js understands.
function parseUciMove(uciMove: string) {
  return {
    from:      uciMove.slice(0, 2),
    to:        uciMove.slice(2, 4),
    promotion: uciMove[4] as string | undefined,
  };
}

export default function Tablero({ onMoveRecorded }: TableroProps) {
  const [game, setGame]                     = useState(() => new Chess());
  const [isMaiaThinking, setIsMaiaThinking] = useState(false);

  // Tracks when the player's turn started. We use a ref because changing this
  // value should NOT trigger a re-render — it's a timer, not display data.
  // Starts immediately since the player moves first (white).
  const playerTurnStartedAt = useRef<number>(Date.now());

  // Asks Maia for her move and applies it to the board.
  // Receives the game state AFTER the player has already moved.
  const requestAndApplyMaiaMove = useCallback(async (gameAfterPlayerMove: Chess) => {
    setIsMaiaThinking(true);
    try {
      const { bestMove } = await pedirJugadaMaia(gameAfterPlayerMove.fen());
      const { from, to, promotion } = parseUciMove(bestMove);

      // Clone before applying Maia's move so React detects the state change.
      const gameAfterMaiaMove = new Chess(gameAfterPlayerMove.fen());
      const maiaMove = gameAfterMaiaMove.move({ from, to, promotion });

      setGame(gameAfterMaiaMove);

      onMoveRecorded({
        san:            maiaMove.san,
        player:         'maia',
        thinkingTimeMs: 0,
        isTilt:         false,
        fen:            gameAfterMaiaMove.fen(),
      });

      // Maia is done — the player's clock starts now.
      playerTurnStartedAt.current = Date.now();
    } catch (error) {
      console.error("Maia did not respond:", error);
    } finally {
      setIsMaiaThinking(false);
    }
  }, [onMoveRecorded]);

  // Called by react-chessboard when the player drops a piece.
  // Returns true to confirm the move, or false to snap the piece back.
  const handlePieceDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      // Reject input while Maia is thinking, or if the piece was dropped off the board.
      if (isMaiaThinking || !targetSquare) return false;

      // Try the move on a copy — chess.js throws if the move is illegal.
      const gameAfterPlayerMove = new Chess(game.fen());
      let playerMove;
      try {
        playerMove = gameAfterPlayerMove.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q", // auto-promote to queen for now
        });
        if (!playerMove) return false;
      } catch {
        return false;
      }

      // Measure how long the player took since their turn started.
      const thinkingTimeMs = Date.now() - playerTurnStartedAt.current;
      const isTilt         = thinkingTimeMs < TILT_THRESHOLD_MS;

      onMoveRecorded({
        san:            playerMove.san,
        player:         'human',
        thinkingTimeMs,
        isTilt,
        fen:            gameAfterPlayerMove.fen(),
      });

      // Update the board with the player's move.
      setGame(gameAfterPlayerMove);

      // Ask Maia to respond, but only if the game is still going.
      if (!gameAfterPlayerMove.isGameOver()) {
        requestAndApplyMaiaMove(gameAfterPlayerMove);
      }

      return true;
    },
    [game, isMaiaThinking, onMoveRecorded, requestAndApplyMaiaMove]
  );

  // currentPosition is derived from game on every render.
  // Keeping it as a single source of truth avoids React rendering an inconsistent frame.
  const currentPosition = game.fen();

  return (
    <div className="w-full max-w-[480px]">
      {/* Fixed height prevents layout shifts when the "thinking" text appears or disappears,
          which would otherwise cause the board to resize and trigger visual glitches. */}
      <div className="h-6 mb-2 flex items-center justify-center">
        {isMaiaThinking && (
          <p className="text-sm text-zinc-400">Maia is thinking…</p>
        )}
      </div>
      {/* boardStyle overrides the library default of height:100%, which causes row gaps
          when the parent has no explicit height. height:auto lets the grid size naturally. */}
      <Chessboard options={{
        position: currentPosition,
        onPieceDrop: handlePieceDrop,
        boardStyle: { height: 'auto' },
      }} />
    </div>
  );
}
