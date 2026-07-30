import React from "react";

/**
 * Entries now carry `probability` alongside the binary label, so the log
 * shows how close each call was to the 0.5 boundary rather than just which
 * side it landed on.
 */
export default function InferenceLog({ history = [] }) {
  if (!history.length) return null;

  return (
    <ul className="divide-y divide-neutral-800 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
      {history.map((entry, i) => (
        <li
          key={i}
          className="grid grid-cols-[6rem_1fr_5rem_5rem] items-center gap-3 px-4 py-2.5"
        >
          <span className="font-mono text-xs text-neutral-400">{entry.model}</span>

          <div className="h-1.5 overflow-hidden rounded-sm bg-neutral-900">
            <div
              className={`h-full rounded-sm ${
                entry.prediction === 1 ? "bg-amber-500" : "bg-neutral-600"
              }`}
              style={{ width: `${(entry.probability ?? 0) * 100}%` }}
            />
          </div>

          <span className="text-right font-mono text-xs tabular-nums text-neutral-200">
            {entry.probability != null ? entry.probability.toFixed(4) : "—"}
          </span>

          <span className="text-right font-mono text-[11px] tabular-nums text-neutral-600">
            {entry.time}
          </span>
        </li>
      ))}
    </ul>
  );
}