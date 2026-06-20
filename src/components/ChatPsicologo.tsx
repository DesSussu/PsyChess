"use client";

import { useState, useEffect, useRef } from "react";
import { streamPsychologistResponse } from "@/services/psychologist";
import type { MoveRecord } from "@/types/game";

type ChatPsicologoProps = {
  moves: MoveRecord[];
};

type Message = {
  role: "psychologist";
  // Full raw text including <think>...</think>.
  // We strip the thinking block before displaying.
  rawContent: string;
};

/**
 * DeepSeek-R1 streams its internal reasoning inside <think>...</think> FIRST,
 * then sends the actual response after </think>.
 *
 * During streaming we handle three states:
 *   1. <think> not yet started       → show the text as-is
 *   2. <think> open, no </think> yet → return "" (show "Thinking…" placeholder)
 *   3. </think> closed               → show what comes AFTER it
 *      If nothing came after (model put everything inside <think>), fall back
 *      to showing the think content itself.
 */
function getVisibleContent(rawText: string): string {
  const thinkStart = rawText.indexOf("<think>");
  const thinkEnd   = rawText.indexOf("</think>");

  if (thinkStart === -1) return rawText.trim();
  if (thinkEnd   === -1) return rawText.slice(0, thinkStart).trim();

  const afterThink = rawText.slice(thinkEnd + "</think>".length).trim();

  if (afterThink) return afterThink;

  // Fallback: model put its entire answer inside <think>.
  return rawText.slice(thinkStart + "<think>".length, thinkEnd).trim();
}

export default function ChatPsicologo({ moves }: ChatPsicologoProps) {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef                 = useRef<HTMLDivElement>(null);

  // Trigger a coach response after every human move.
  const lastMove = moves.at(-1);
  const shouldIntervene = lastMove?.player === "human";

  useEffect(() => {
    if (!shouldIntervene || isStreaming) return;

    async function fetchResponse() {
      setIsStreaming(true);
      setMessages(prev => [...prev, { role: "psychologist", rawContent: "" }]);

      try {
        for await (const token of streamPsychologistResponse(moves)) {
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

  // We only want to trigger when a new tilt move lands — not on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moves.length]);

  // Scroll to the bottom whenever a new message arrives.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <aside className="flex h-full flex-col rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="mb-3 text-sm font-semibold text-zinc-500">
        Entrenador (DeepSeek-R1)
      </h2>

      <div className="flex-1 overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-400">
            Jugá tu primera movida. El entrenador analizará cada jugada tuya.
          </p>
        )}

        {messages.map((msg, index) => (
          <div key={index} className="space-y-2">
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {msg.rawContent || <span className="text-zinc-400 italic">Analizando…</span>}
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
