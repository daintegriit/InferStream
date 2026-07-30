import React, { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8007";

/**
 * Scores every loaded model on the same input.
 *
 * Models don't share a feature contract -- xgboost and sklearn take 12
 * columns, engagement takes 13 -- so this renders the UNION of their
 * inputs and sends each model only the subset it declares. No feature
 * list is hardcoded.
 */
export default function ModelComparisonPanel() {
  const [models, setModels] = useState([]);
  const [values, setValues] = useState({});
  const [results, setResults] = useState({});
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/predict/schema`)
      .then((res) => {
        if (!res.ok) throw new Error(`Schema unavailable (${res.status})`);
        return res.json();
      })
      .then((data) => {
        setModels(data.models);
        setValues(seedUnion(data.models));
        setStatus("ready");
      })
      .catch((e) => {
        setError(`${e.message}. Is the API running on ${API}?`);
        setStatus("error");
      });
  }, []);

  // Every distinct feature across every model, in first-seen order.
  const union = useMemo(() => {
    const seen = new Map();
    for (const model of models) {
      for (const feature of model.features) {
        if (!seen.has(feature.name)) {
          seen.set(feature.name, { ...feature, usedBy: [model.model] });
        } else {
          seen.get(feature.name).usedBy.push(model.model);
        }
      }
    }
    return [...seen.values()];
  }, [models]);

  async function compare() {
    setStatus("comparing");
    setResults({});

    const next = {};
    await Promise.all(
      models.map(async (model) => {
        // Send only what this model declares.
        const features = {};
        for (const f of model.features) {
          features[f.name] = f.type === "numeric" ? Number(values[f.name]) : values[f.name];
        }

        try {
          const res = await fetch(`${API}/predict/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: model.model, features }),
          });
          const body = await res.json();
          next[model.model] = res.ok
            ? { probability: body.probability, prediction: body.prediction }
            : { error: body.detail || `HTTP ${res.status}` };
        } catch {
          next[model.model] = { error: "unreachable" };
        }
      })
    );

    setResults(next);
    setStatus("ready");
  }

  if (status === "loading") {
    return (
      <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
        Loading model contracts
      </p>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-lg border border-red-900/60 bg-neutral-950 p-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-red-400">
          Contracts unavailable
        </p>
        <p className="mt-2 text-sm text-neutral-300">{error}</p>
      </div>
    );
  }

  const scored = Object.entries(results).filter(([, r]) => r.probability != null);
  const maxProbability = scored.length ? Math.max(...scored.map(([, r]) => r.probability)) : 0;

  return (
    <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 text-neutral-100">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-3 border-b border-neutral-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Model comparison</h2>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
            {models.length} models · {union.length} distinct features
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {models.map((m) => (
            <span
              key={m.model}
              className="rounded-sm border border-neutral-800 bg-neutral-900 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-neutral-400"
            >
              {m.model} · {m.features.length}
            </span>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {union.map((feature) => (
          <label key={feature.name} className="block">
            <span className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-400">
                {feature.name.replace(/_/g, " ")}
              </span>
              {feature.usedBy.length < models.length && (
                <span
                  className="font-mono text-[10px] text-neutral-600"
                  title={`Only used by: ${feature.usedBy.join(", ")}`}
                >
                  {feature.usedBy.length}/{models.length}
                </span>
              )}
            </span>

            {feature.type === "categorical" ? (
              <select
                value={values[feature.name] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [feature.name]: e.target.value }))
                }
                className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-amber-500 focus:outline-none"
              >
                {feature.allowed_values.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                step="any"
                value={values[feature.name] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [feature.name]: e.target.value }))
                }
                className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-sm tabular-nums text-neutral-100 focus:border-amber-500 focus:outline-none"
              />
            )}
          </label>
        ))}
      </div>

      <button
        onClick={compare}
        disabled={status === "comparing"}
        className="mt-6 rounded bg-amber-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-40"
      >
        {status === "comparing" ? "Scoring…" : "Score all models"}
      </button>

      {Object.keys(results).length > 0 && (
        <div className="mt-6 space-y-2.5 border-t border-neutral-800 pt-5">
          {models.map((m) => {
            const r = results[m.model];
            if (!r) return null;

            if (r.error) {
              return (
                <div
                  key={m.model}
                  className="grid grid-cols-[7rem_1fr] items-center gap-3"
                >
                  <span className="font-mono text-xs text-neutral-400">{m.model}</span>
                  <span className="truncate font-mono text-xs text-red-400" title={r.error}>
                    {r.error}
                  </span>
                </div>
              );
            }

            const width = maxProbability > 0 ? (r.probability / maxProbability) * 100 : 0;
            return (
              <div key={m.model} className="grid grid-cols-[7rem_1fr_4.5rem] items-center gap-3">
                <span className="font-mono text-xs text-neutral-400">{m.model}</span>
                <div className="h-6 overflow-hidden rounded-sm bg-neutral-900">
                  <div
                    className="h-full rounded-sm bg-neutral-600 transition-[width] duration-500 ease-out"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="text-right font-mono text-xs tabular-nums text-neutral-200">
                  {r.probability.toFixed(4)}
                </span>
              </div>
            );
          })}

          <p className="pt-2 text-xs leading-relaxed text-neutral-500">
            Models trained on different targets aren't directly comparable — engagement and
            churn answer different questions. Read this as contract coverage, not a leaderboard.
          </p>
        </div>
      )}
    </section>
  );
}

function seedUnion(models) {
  const out = {};
  for (const model of models) {
    for (const f of model.features) {
      if (out[f.name] !== undefined) continue;
      out[f.name] = f.type === "categorical" ? f.allowed_values[0] : 0;
    }
  }
  return out;
}