"use client";

import type { MoveRecord } from "@/types/game";

type HistorialProps = {
  moves: MoveRecord[];
};

export default function Historial({ moves }: HistorialProps) {
  return (
    <section className="w-full max-w-[480px] rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="mb-3 text-sm font-semibold text-zinc-500">Move history</h2>

      {moves.length === 0 ? (
        <p className="text-sm text-zinc-400">No moves yet.</p>
      ) : (
        <ol className="space-y-1">
          {moves.map((move, index) => (
            <li key={index} className="flex items-center justify-between text-sm">
              <span className={move.player === 'human' ? 'font-medium' : 'text-zinc-400'}>
                {move.player === 'human' ? '⬜' : '⬛'} {move.san}
              </span>

              {move.player === 'human' && (
                <span className={move.isTilt ? 'text-red-500 font-semibold' : 'text-zinc-400'}>
                  {(move.thinkingTimeMs / 1000).toFixed(1)}s
                  {move.isTilt && ' ⚡ tilt'}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
