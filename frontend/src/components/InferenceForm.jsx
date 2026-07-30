import React, { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8007";

/**
 * Renders itself from GET /predict/schema.
 *
 * No feature list, no dropdown options, no field order lives in this file.
 * Retrain with a new column and this form grows a field on next load.
 */
export default function InferenceForm({ modelType, onResult }) {
  const [schema, setSchema] = useState(null);
  const [values, setValues] = useState({});
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");

    fetch(`${API}/predict/schema`)
      .then((res) => {
        if (!res.ok) throw new Error(`Schema unavailable (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const found = data.models.find((m) => m.model === modelType);
        if (!found) {
          setError(
            `Model "${modelType}" isn't loaded. Available: ${data.models
              .map((m) => m.model)
              .join(", ")}`
          );
          setStatus("error");
          return;
        }
        setSchema(found);
        setValues(seedDefaults(found.features));
        setStatus("ready");
      })
      .catch((e) => {
        if (cancelled) return;
        setError(`${e.message}. Is the API running on ${API}?`);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [modelType]);

  const counts = useMemo(() => {
    if (!schema) return null;
    const numeric = schema.features.filter((f) => f.type === "numeric").length;
    return {
      total: schema.features.length,
      numeric,
      categorical: schema.features.length - numeric,
    };
  }, [schema]);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const features = {};
    for (const f of schema.features) {
      features[f.name] = f.type === "numeric" ? Number(values[f.name]) : values[f.name];
    }

    try {
      const res = await fetch(`${API}/predict/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelType, features }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.detail || `Request failed (${res.status})`);
        setStatus("ready");
        return;
      }

      onResult({ ...body, features });
      setStatus("ready");
    } catch {
      setError(`Could not reach ${API}`);
      setStatus("ready");
    }
  }

  if (status === "loading") {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-base p-6">
        <p className="font-mono text-xs uppercase tracking-widest text-content-muted">
          Reading contract from {modelType}
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-lg border border-risk-dim bg-surface-base p-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-risk">
          Contract unavailable
        </p>
        <p className="mt-2 text-sm leading-relaxed text-content-secondary">{error}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-surface-border bg-surface-base p-6 text-content"
    >
      <header className="mb-6 border-b border-surface-border pb-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Run inference</h2>
          <span className="font-mono text-xs text-content">{modelType}</span>
        </div>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-content-muted">
          {counts.total} features · {counts.numeric} numeric · {counts.categorical} categorical
          <span className="ml-2 text-content-muted">from artifact</span>
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {schema.features.map((feature) => (
          <Field
            key={feature.name}
            feature={feature}
            value={values[feature.name]}
            onChange={(v) => setValues((prev) => ({ ...prev, [feature.name]: v }))}
          />
        ))}
      </div>

      {error && (
        <p className="mt-5 rounded border border-risk-dim bg-risk-wash px-3 py-2 font-mono text-xs leading-relaxed text-risk">
          {error}
        </p>
      )}

      {/* Neutral action: bone-white, not red. Red is reserved for data. */}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-6 w-full rounded bg-risk px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-risk-dim focus:outline-none focus-visible:ring-2 focus-visible:ring-risk disabled:opacity-40"
      >
        {status === "submitting" ? "Predicting…" : "Predict"}
      </button>
    </form>
  );
}

function Field({ feature, value, onChange }) {
  const label = feature.name.replace(/_/g, " ");
  const base =
    "w-full rounded border border-surface-border bg-surface-raised px-3 py-2 text-sm text-content focus:border-accent focus:outline-none";

  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-content-secondary">
        {label}
      </span>

      {feature.type === "categorical" ? (
        <select
          className={base}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          required
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
          className={`${base} font-mono tabular-nums`}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          required
        />
      )}
    </label>
  );
}

function seedDefaults(features) {
  const out = {};
  for (const f of features) {
    out[f.name] = f.type === "categorical" ? f.allowed_values[0] : 0;
  }
  return out;
}