import React from "react";
import { FiAlertCircle, FiTrendingUp, FiTrendingDown } from "react-icons/fi";

/**
 * Reads `probability` (the API field) rather than `confidence` (which never
 * existed), and shows distance from the 0.5 boundary -- 0.51 and 0.99 are
 * both "1" but mean very different things.
 */
export default function PredictionResult({ data }) {
  if (!data) return null;

  if (data.error) {
    return (
      <div className="rounded-lg border border-red-900/60 bg-neutral-950 p-5">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-red-400">
          <FiAlertCircle aria-hidden />
          Prediction failed
        </p>
        <p className="mt-2 text-sm leading-relaxed text-neutral-300">{data.error}</p>
      </div>
    );
  }

  const { model, prediction, probability } = data;
  const positive = prediction === 1;
  const pct = probability != null ? probability * 100 : null;

  // How far from the decision boundary, as a share of the distance to the edge.
  const margin = probability != null ? Math.abs(probability - 0.5) * 2 : null;
  const confidenceLabel =
    margin == null ? null : margin > 0.8 ? "decisive" : margin > 0.3 ? "clear" : "near boundary";

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-5 text-neutral-100">
      <header className="flex items-baseline justify-between border-b border-neutral-800 pb-3">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
          Result
        </h3>
        <span className="font-mono text-xs text-amber-400">{model}</span>
      </header>

      <div className="mt-4 flex flex-wrap items-baseline gap-8">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">
            probability
          </p>
          <p className="mt-0.5 font-mono text-4xl tabular-nums text-amber-400">
            {probability != null ? probability.toFixed(4) : "—"}
          </p>
        </div>

        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">
            label
          </p>
          <p className="mt-0.5 flex items-center gap-2 font-mono text-4xl tabular-nums text-neutral-300">
            {positive ? (
              <FiTrendingUp className="text-2xl text-amber-500" aria-hidden />
            ) : (
              <FiTrendingDown className="text-2xl text-neutral-500" aria-hidden />
            )}
            {prediction}
          </p>
        </div>

        {confidenceLabel && (
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">
              margin
            </p>
            <p className="mt-0.5 font-mono text-sm text-neutral-400">{confidenceLabel}</p>
          </div>
        )}
      </div>

      {pct != null && (
        <div className="mt-5">
          <div className="relative h-2 overflow-hidden rounded-sm bg-neutral-900">
            <div
              className={`h-full rounded-sm transition-[width] duration-500 ease-out ${
                positive ? "bg-amber-500" : "bg-neutral-600"
              }`}
              style={{ width: `${pct}%` }}
            />
            {/* Decision boundary -- everything right of this predicts 1. */}
            <div className="absolute inset-y-0 left-1/2 w-px bg-neutral-500" />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[10px] tabular-nums text-neutral-600">
            <span>0</span>
            <span>0.5 boundary</span>
            <span>1</span>
          </div>
        </div>
      )}
    </div>
  );
}