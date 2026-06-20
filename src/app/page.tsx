import Tablero from "@/components/Tablero";
import ChatPsicologo from "@/components/ChatPsicologo";
import Historial from "@/components/Historial";

export default function Home() {
  return (
    <main className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col items-center gap-6">
        <h1 className="text-2xl font-bold tracking-tight">PsyChess 🧠♟️</h1>
        <Tablero />
        <Historial />
      </div>
      <ChatPsicologo />
    </main>
  );
}
