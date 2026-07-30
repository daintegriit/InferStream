import React, { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8007";

/**
 * Counterfactual sweep.
 *
 * Bars are scaled 0..1 against the probability range, NOT normalised to the
 * largest value: normalising turns a 0.0001 gap between near-zero values
 * into a dramatic visual difference.
 *
 * Both measures are reported. Absolute spread is right near 0.5; near the
 * tails it hides real effects, because 0.0045 on a base of 0.015 is a 1.3x
 * swing. Red appears only when one of them is material.
 */
export default function FairnessChart({ result }) {
  const [attributes, setAttributes] = useState([]);
  const [attribute, setAttribute] = useState("gender");
  const [sweep, setSweep] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!result?.model) return;

    fetch(`${API}/predict/schema`)
      .then((res) => res.json())
      .then((data) => {
        const model = data.models.find((m) => m.model === result.model);
        if (!model) return;
        const categorical = model.features
          .filter((f) => f.type === "categorical")
          .map((f) => f.name);
        setAttributes(categorical);
        if (!categorical.includes(attribute) && categorical.length) {
          setAttribute(categorical[0]);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.model]);

  useEffect(() => {
    if (!result?.model || !result?.features || !attribute) return;

    let cancelled = false;
    setStatus("loading");
    setError(null);

    fetch(`${API}/predict/fairness?attribute=${encodeURIComponent(attribute)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: result.model, features: result.features }),
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.detail || `Request failed (${res.status})`);
        return body;
      })
      .then((body) => {
        if (cancelled) return;
        setSweep(body.fairness_check);
        setStatus("ready");
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [result, attribute]);

  const rows = useMemo(() => {
    if (!sweep) return [];
    return Object.entries(sweep.probabilities)
      .sort((a, b) => b[1] - a[1])
      .map(([value, probability]) => ({
        value,
        probability,
        width: probability * 100,
        observed: value === sweep.observed_value,
      }));
  }, [sweep]);

  const ratio = useMemo(() => {
    if (!sweep) return null;
    const values = Object.values(sweep.probabilities);
    const low = Math.min(...values);
    return low > 0 ? Math.max(...values) / low : null;
  }, [sweep]);

  const materialAbsolute = sweep && sweep.max_spread >= 0.1;
  const materialRelative = ratio != null && ratio >= 1.25;

  return (
    <section className="rounded-lg border border-surface-border bg-surface-base p-6 text-content">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-3 border-b border-surface-border pb-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Counterfactual sweep</h2>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-content-muted">
            All features held fixed except one
          </p>
        </div>

        {attributes.length > 0 && (
          <label className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-content-muted">
              vary
            </span>
            <select
              value={attribute}
              onChange={(e) => setAttribute(e.target.value)}
              className="rounded border border-surface-border bg-surface-raised px-2 py-1 font-mono text-xs text-content focus:border-accent focus:outline-none"
            >
              {attributes.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {!result?.features && (
        <p className="text-sm text-content-muted">Run a prediction to sweep it.</p>
      )}

      {status === "loading" && (
        <p className="font-mono text-xs uppercase tracking-widest text-content-muted">
          Scoring {attribute} variants
        </p>
      )}

      {status === "error" && (
        <p className="rounded border border-risk-dim bg-risk-wash px-3 py-2 font-mono text-xs text-risk">
          {error}
        </p>
      )}

      {status === "ready" && sweep && (
        <>
          <div className="space-y-2.5">
            {rows.map((row) => (
              <div key={row.value} className="grid grid-cols-[9rem_1fr_4.5rem] items-center gap-3">
                <span
                  className={`truncate font-mono text-xs ${
                    row.observed ? "text-content" : "text-content-secondary"
                  }`}
                  title={row.value}
                >
                  {row.value}
                  {row.observed && <span className="ml-1 text-content-muted">◂</span>}
                </span>

                <div className="relative h-6 overflow-hidden rounded-sm bg-surface-raised">
                  <div
                    className={`h-full rounded-sm transition-[width] duration-500 ease-out ${
                      row.probability >= 0.5
                        ? "bg-risk"
                        : row.observed
                        ? "bg-content-muted"
                        : "bg-surface-overlay"
                    }`}
                    style={{ width: `${Math.max(row.width, 0.4)}%` }}
                  />
                  <div className="absolute inset-y-0 left-1/2 w-px bg-surface-overlay" />
                </div>

                <span className="text-right font-mono text-xs tabular-nums text-content-secondary">
                  {row.probability.toFixed(4)}
                </span>
              </div>
            ))}
          </div>

          <footer className="mt-5 border-t border-surface-border pt-4">
            <div className="flex flex-wrap items-baseline gap-8">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[11px] uppercase tracking-widest text-content-muted">
                  absolute
                </span>
                <span
                  className={`font-mono text-2xl tabular-nums ${
                    materialAbsolute ? "text-risk" : "text-content-secondary"
                  }`}
                >
                  {sweep.max_spread.toFixed(4)}
                </span>
              </div>

              {ratio != null && (
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-content-muted">
                    relative
                  </span>
                  <span
                    className={`font-mono text-2xl tabular-nums ${
                      materialRelative ? "text-risk" : "text-content-secondary"
                    }`}
                  >
                    {ratio.toFixed(2)}×
                  </span>
                </div>
              )}
            </div>

            <p className="mt-3 max-w-prose text-sm leading-relaxed text-content-secondary">
              {materialAbsolute ? (
                <>
                  Changing <span className="text-content">{attribute}</span> alone moves the
                  prediction by {(sweep.max_spread * 100).toFixed(1)} points. Worth understanding
                  before this model informs a decision about anyone.
                </>
              ) : materialRelative ? (
                <>
                  The absolute gap is small, but the highest group is{" "}
                  <span className="text-content">{ratio.toFixed(2)}×</span> the lowest. Near
                  the tails a small absolute difference is a large proportional one — worth
                  checking before treating{" "}
                  <span className="text-content">{attribute}</span> as inert.
                </>
              ) : (
                <>
                  <span className="text-content">{attribute}</span> moves the prediction
                  negligibly on both measures. The bars are near-identical because the effect is
                  near-zero, not because the chart is flat.
                </>
              )}
            </p>
          </footer>
        </>
      )}
    </section>
  );
}