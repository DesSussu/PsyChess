"use client";

/**
 * Historial — lista de jugadas y TIEMPOS empleados en cada una.
 *
 * Este componente es el corazón de la detección de impulsividad (tilt):
 * mide cuánto tardó el jugador en cada movimiento. Una jugada en
 * milisegundos justo después de perder material = señal de tilt.
 *
 * TODO:
 *  - Recibir la lista de jugadas + timestamps como props (estado en page.tsx).
 *  - Calcular el delta de tiempo por jugada.
 *  - Marcar visualmente las jugadas "impulsivas".
 */
export default function Historial() {
  return (
    <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="mb-2 text-sm font-semibold text-zinc-500">Historial</h2>
      <p className="text-sm text-zinc-400">
        Jugadas y tiempos aparecerán aquí.
      </p>
    </section>
  );
}
