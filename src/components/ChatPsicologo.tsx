"use client";

/**
 * ChatPsicologo — ventana de chat con el psicólogo de IA (DeepSeek-R1).
 *
 * Responsabilidad: mostrar los mensajes del psicólogo en streaming.
 * NO contiene la lógica del modelo: eso vive en /src/services + /api.
 *
 * TODO (cuando entendamos los conceptos):
 *  - Consumir un stream (Server-Sent Events / ReadableStream) desde la API.
 *  - Separar el "razonamiento interno" (<think>) de la respuesta final de R1.
 *  - Disparar la intervención cuando Historial detecta tilt.
 */
export default function ChatPsicologo() {
  return (
    <aside className="flex h-full flex-col rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="mb-2 text-sm font-semibold text-zinc-500">
        Psicólogo (DeepSeek-R1)
      </h2>
      <p className="text-sm text-zinc-400">
        Acá va el chat en streaming. Todavía sin conectar al modelo.
      </p>
    </aside>
  );
}
