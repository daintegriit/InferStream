import React, { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8007";

/**
 * Counterfactual sweep.
 *
 * Holds every feature fixed except one, re-scores across all of that
 * attribute's legal values, and shows the spread.
 *
 * Bars are scaled 0..1 against the probability range, NOT normalised to the
 * largest value in the set. Normalising to max turns a 0.0001 difference
 * between near-zero probabilities into a dramatic visual gap -- the chart
 * would show a huge effect where there is none. Absolute scaling means a
 * negligible spread looks negligible, which is the honest reading.
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
        width: probability * 100, // absolute 0..1 scale
        observed: value === sweep.observed_value,
      }));
  }, [sweep]);

  const negligible = sweep && sweep.max_spread < 0.01;

  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-neutral-100">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-3 border-b border-neutral-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Counterfactual sweep</h2>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
            All features held fixed except one
          </p>
        </div>

        {attributes.length > 0 && (
          <label className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">
              vary
            </span>
            <select
              value={attribute}
              onChange={(e) => setAttribute(e.target.value)}
              className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 font-mono text-xs text-amber-400 focus:border-amber-500 focus:outline-none"
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
        <p className="text-sm text-neutral-500">Run a prediction to sweep it.</p>
      )}

      {status === "loading" && (
        <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
          Scoring {attribute} variants
        </p>
      )}

      {status === "error" && (
        <p className="rounded border border-red-900/60 bg-red-950/30 px-3 py-2 font-mono text-xs text-red-300">
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
                    row.observed ? "text-amber-400" : "text-neutral-400"
                  }`}
                  title={row.value}
                >
                  {row.value}
                  {row.observed && <span className="ml-1 text-neutral-600">◂</span>}
                </span>

                <div className="relative h-6 overflow-hidden rounded-sm bg-neutral-900">
                  <div
                    className={`h-full rounded-sm transition-[width] duration-500 ease-out ${
                      row.observed ? "bg-amber-500" : "bg-neutral-700"
                    }`}
                    style={{ width: `${Math.max(row.width, 0.4)}%` }}
                  />
                  {/* Decision boundary, so bar position carries meaning. */}
                  <div className="absolute inset-y-0 left-1/2 w-px bg-neutral-700/70" />
                </div>

                <span className="text-right font-mono text-xs tabular-nums text-neutral-300">
                  {row.probability.toFixed(4)}
                </span>
              </div>
            ))}
          </div>

          <footer className="mt-5 border-t border-neutral-800 pt-4">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
                spread
              </span>
              <span
                className={`font-mono text-2xl tabular-nums ${
                  sweep.max_spread >= 0.1 ? "text-amber-400" : "text-neutral-300"
                }`}
              >
                {sweep.max_spread.toFixed(4)}
              </span>
            </div>

            <p className="mt-2 max-w-prose text-sm leading-relaxed text-neutral-400">
              {sweep.max_spread >= 0.1 ? (
                <>
                  Changing <span className="text-neutral-200">{attribute}</span> alone moves the
                  prediction by {(sweep.max_spread * 100).toFixed(1)} points. Worth understanding
                  before this model informs a decision about anyone.
                </>
              ) : negligible ? (
                <>
                  <span className="text-neutral-200">{attribute}</span> changes the prediction by
                  less than 0.01. The bars are near-identical because the effect is near-zero,
                  not because the chart is flat.
                </>
              ) : (
                <>
                  <span className="text-neutral-200">{attribute}</span> moves the prediction by
                  under a point. This attribute is not driving the output for this input.
                </>
              )}
            </p>
          </footer>
        </>
      )}
    </section>
  );
}