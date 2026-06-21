"use client";

import { useState, useEffect, useRef } from "react";
import { streamPsychologistResponse } from "@/services/psychologist";
import type { MoveRecord } from "@/types/game";

type ChatPsicologoProps = {
  moves: MoveRecord[];
};

type Message = {
  role: "psychologist";
  rawContent: string;
};

function getVisibleContent(rawText: string): string {
  const thinkStart = rawText.indexOf("<think>");
  const thinkEnd   = rawText.indexOf("</think>");

  if (thinkStart === -1) return rawText.trim();
  if (thinkEnd   === -1) return rawText.slice(0, thinkStart).trim();

  const afterThink = rawText.slice(thinkEnd + "</think>".length).trim();

  if (afterThink) return afterThink;

  return rawText.slice(thinkStart + "<think>".length, thinkEnd).trim();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ChatPsicologo({ moves }: ChatPsicologoProps) {
  const [messages, setMessages]     = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [boardImage, setBoardImage]  = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const bottomRef                    = useRef<HTMLDivElement>(null);
  const fileInputRef                 = useRef<HTMLInputElement>(null);

  const lastMove = moves.at(-1);
  const shouldIntervene = lastMove?.player === "human";

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setBoardImage(b64);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setBoardImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  useEffect(() => {
    if (!shouldIntervene || isStreaming) return;

    async function fetchResponse() {
      setIsStreaming(true);
      setMessages(prev => [...prev, { role: "psychologist", rawContent: "" }]);

      try {
        for await (const token of streamPsychologistResponse(moves, boardImage ?? undefined)) {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              rawContent: updated[updated.length - 1].rawContent + token,
            };
            return updated;
          });
        }
      } catch (error) {
        console.error("Psychologist stream failed:", error);
      } finally {
        setIsStreaming(false);
      }
    }

    fetchResponse();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moves.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <aside className="flex h-full flex-col rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-500">Entrenador IA</h2>
        <label className="cursor-pointer rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          📷 Analizar imagen
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
        </label>
      </div>

      {imagePreview && (
        <div className="mb-3 flex items-start gap-2">
          <img
            src={imagePreview}
            alt="Tablero seleccionado"
            className="max-h-20 rounded border border-zinc-200 object-contain dark:border-zinc-700"
          />
          <button
            onClick={clearImage}
            className="mt-1 text-xs text-zinc-400 hover:text-zinc-600"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-400">
            Jugá tu primera movida. El entrenador analizará cada jugada tuya.
          </p>
        )}

        {messages.map((msg, index) => (
          <div key={index} className="space-y-2">
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {getVisibleContent(msg.rawContent) || <span className="text-zinc-400 italic">Analizando…</span>}
            </p>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {isStreaming && (
        <p className="mt-2 text-xs text-zinc-400">Psychologist is writing…</p>
      )}
    </aside>
  );
}
