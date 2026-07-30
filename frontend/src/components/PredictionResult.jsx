import React from "react";
import { FiAlertCircle, FiTrendingUp, FiTrendingDown } from "react-icons/fi";

/**
 * Colour carries meaning: the probability figure and its bar turn red only
 * above the decision boundary. A low score stays neutral.
 */
export default function PredictionResult({ data }) {
  if (!data) return null;

  if (data.error) {
    return (
      <div className="rounded-lg border border-risk-dim bg-surface-base p-5">
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-risk">
          <FiAlertCircle aria-hidden />
          Prediction failed
        </p>
        <p className="mt-2 text-sm leading-relaxed text-content-secondary">{data.error}</p>
      </div>
    );
  }

  const { model, prediction, probability } = data;
  const positive = prediction === 1;
  const pct = probability != null ? probability * 100 : null;

  const margin = probability != null ? Math.abs(probability - 0.5) * 2 : null;
  const marginLabel =
    margin == null ? null : margin > 0.8 ? "decisive" : margin > 0.3 ? "clear" : "near boundary";

  return (
    <div className="rounded-lg border border-surface-border bg-surface-base p-5 text-content">
      <header className="flex items-baseline justify-between border-b border-surface-border pb-3">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-content-muted">
          Result
        </h3>
        <span className="font-mono text-xs text-content">{model}</span>
      </header>

      <div className="mt-4 flex flex-wrap items-baseline gap-8">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-content-muted">
            probability
          </p>
          <p
            className={`mt-0.5 font-mono text-4xl tabular-nums ${
              positive ? "text-risk" : "text-content"
            }`}
          >
            {probability != null ? probability.toFixed(4) : "—"}
          </p>
        </div>

        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-content-muted">
            label
          </p>
          <p className="mt-0.5 flex items-center gap-2 font-mono text-4xl tabular-nums text-content-secondary">
            {positive ? (
              <FiTrendingUp className="text-2xl text-risk" aria-hidden />
            ) : (
              <FiTrendingDown className="text-2xl text-content-muted" aria-hidden />
            )}
            {prediction}
          </p>
        </div>

        {marginLabel && (
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-content-muted">
              margin
            </p>
            <p className="mt-0.5 font-mono text-sm text-content-secondary">{marginLabel}</p>
          </div>
        )}
      </div>

      {pct != null && (
        <div className="mt-5">
          <div className="relative h-2 overflow-hidden rounded-sm bg-surface-raised">
            <div
              className={`h-full rounded-sm transition-[width] duration-500 ease-out ${
                positive ? "bg-risk" : "bg-content-muted"
              }`}
              style={{ width: `${pct}%` }}
            />
            <div className="absolute inset-y-0 left-1/2 w-px bg-content-muted" />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[10px] tabular-nums text-content-muted">
            <span>0</span>
            <span>0.5 boundary</span>
            <span>1</span>
          </div>
        </div>
      )}
    </div>
  );
}