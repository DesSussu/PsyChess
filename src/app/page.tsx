"use client";

import { useState } from "react";
import Tablero from "@/components/Tablero";
import ChatPsicologo from "@/components/ChatPsicologo";
import Historial from "@/components/Historial";
import type { MoveRecord } from "@/types/game";

export default function Home() {
  const [moves, setMoves] = useState<MoveRecord[]>([]);

  function handleMoveRecorded(move: MoveRecord) {
    setMoves(prev => [...prev, move]);
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-2xl font-bold tracking-tight">PsyChess 🧠♟️</h1>
        <Tablero onMoveRecorded={handleMoveRecorded} />
        <Historial moves={moves} />
      </div>
      <ChatPsicologo moves={moves} />
    </main>
  );
}
