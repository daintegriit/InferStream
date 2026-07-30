import React from "react";

/**
 * Entries now carry `probability` alongside the binary label, so the log
 * shows how close each call was to the 0.5 boundary rather than just which
 * side it landed on.
 */
export default function InferenceLog({ history = [] }) {
  if (!history.length) return null;

  return (
    <ul className="divide-y divide-surface-border overflow-hidden rounded-lg border border-surface-border bg-surface-base">
      {history.map((entry, i) => (
        <li
          key={i}
          className="grid grid-cols-[6rem_1fr_5rem_5rem] items-center gap-3 px-4 py-2.5"
        >
          <span className="font-mono text-xs text-content-secondary">{entry.model}</span>

          <div className="h-1.5 overflow-hidden rounded-sm bg-surface-raised">
            <div
              className={`h-full rounded-sm ${
                entry.prediction === 1 ? "bg-risk" : "bg-content-muted"
              }`}
              style={{ width: `${(entry.probability ?? 0) * 100}%` }}
            />
          </div>

          <span className="text-right font-mono text-xs tabular-nums text-content">
            {entry.probability != null ? entry.probability.toFixed(4) : "—"}
          </span>

          <span className="text-right font-mono text-[11px] tabular-nums text-content-muted">
            {entry.time}
          </span>
        </li>
      ))}
    </ul>
  );
}