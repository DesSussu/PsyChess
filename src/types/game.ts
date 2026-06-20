// A move faster than this is considered impulsive (tilt).
export const TILT_THRESHOLD_MS = 2_000;

export type MoveRecord = {
  san: string;            // human-readable move notation, e.g. "e4", "Nf3", "O-O"
  player: 'human' | 'maia';
  thinkingTimeMs: number; // how long the human took to move (0 for Maia moves)
  isTilt: boolean;        // true if the human moved faster than TILT_THRESHOLD_MS
};
