import React, { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8007";

/**
 * Feature registry + online lookup.
 *
 * Reads GET /features/ for definitions and materialisation stats, and
 * GET /features/{name}/entity/{id} for live values. Everything shown here
 * is measured by the platform -- coverage, staleness, lookup latency --
 * rather than declared in a config file.
 */
export default function FeatureTable() {
  const [features, setFeatures] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/features/`)
      .then((res) => {
        if (!res.ok) throw new Error(`Registry unavailable (${res.status})`);
        return res.json();
      })
      .then((data) => {
        setFeatures(data.features || []);
        setStatus("ready");
      })
      .catch((e) => {
        setError(`${e.message}. Is the API running on ${API}?`);
        setStatus("error");
      });
  }, []);

  if (status === "loading") {
    return (
      <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">
        Loading registry
      </p>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-lg border border-red-900/60 bg-neutral-950 p-6">
        <p className="font-mono text-xs uppercase tracking-widest text-red-400">
          Registry unavailable
        </p>
        <p className="mt-2 text-sm text-neutral-300">{error}</p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <header className="flex items-baseline justify-between border-b border-neutral-800 pb-3">
        <h2 className="text-lg font-semibold tracking-tight text-neutral-100">
          Feature registry
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
          {features.length} defined · {features.filter((f) => f.materialized).length} materialised
        </span>
      </header>

      {features.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No features defined. Run{" "}
          <code className="text-neutral-300">build_online_store.py</code> to materialise one.
        </p>
      ) : (
        features.map((feature) => <FeatureCard key={feature.name} feature={feature} />)
      )}
    </section>
  );
}

function FeatureCard({ feature }) {
  const { stats } = feature;
  const coverage = stats ? stats.nonzero / stats.entities : 0;

  return (
    <article className="rounded-lg border border-neutral-800 bg-neutral-950 p-5 text-neutral-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-mono text-sm text-amber-400">{feature.name}</h3>
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-neutral-400">
            {feature.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {feature.point_in_time_verified && (
            <Badge tone="verified">point-in-time verified</Badge>
          )}
          <Badge tone={feature.materialized ? "ok" : "muted"}>
            {feature.materialized ? "materialised" : "not materialised"}
          </Badge>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-neutral-800 pt-4 sm:grid-cols-4">
        <Meta label="entity" value={feature.entity} />
        <Meta label="window" value={formatDuration(feature.window_seconds)} />
        <Meta label="source" value={feature.source} />
        <Meta label="dtype" value={feature.dtype} />
      </dl>

      {stats && (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-neutral-800 pt-4 sm:grid-cols-4">
            <Meta label="entities" value={stats.entities.toLocaleString()} />
            <Meta label="mean" value={stats.mean} />
            <Meta label="max" value={stats.max.toLocaleString()} />
            <Meta
              label="median staleness"
              value={formatDuration(stats.median_staleness_seconds)}
            />
          </dl>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">
                coverage
              </span>
              <span className="font-mono text-xs tabular-nums text-neutral-300">
                {stats.nonzero.toLocaleString()} nonzero · {(coverage * 100).toFixed(1)}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-sm bg-neutral-900">
              <div
                className="h-full rounded-sm bg-amber-500"
                style={{ width: `${Math.max(coverage * 100, 0.5)}%` }}
              />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-neutral-500">
              Most entities read zero because the snapshot is taken at one instant. Only
              entities active inside the window carry a value.
            </p>
          </div>

          <EntityLookup feature={feature} />
        </>
      )}

      {feature.tags?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-neutral-800 pt-4">
          {feature.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-sm bg-neutral-900 px-2 py-0.5 font-mono text-[11px] text-neutral-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function EntityLookup({ feature }) {
  const [entityId, setEntityId] = useState("141567");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function lookup(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `${API}/features/${feature.name}/entity/${encodeURIComponent(entityId)}`
      );
      const body = await res.json();
      if (!res.ok) {
        setError(body.detail || `Lookup failed (${res.status})`);
      } else {
        setResult(body);
      }
    } catch {
      setError(`Could not reach ${API}`);
    }
    setBusy(false);
  }

  return (
    <div className="mt-4 border-t border-neutral-800 pt-4">
      <form onSubmit={lookup} className="flex items-end gap-2">
        <label className="flex-1">
          <span className="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-neutral-500">
            look up {feature.entity}
          </span>
          <input
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            className="w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 font-mono text-sm tabular-nums text-neutral-100 focus:border-amber-500 focus:outline-none"
            placeholder="entity id"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:bg-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-40"
        >
          {busy ? "…" : "Fetch"}
        </button>
      </form>

      {error && (
        <p className="mt-3 rounded border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs leading-relaxed text-neutral-400">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-3 rounded border border-neutral-800 bg-neutral-900/60 p-3">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-3xl tabular-nums text-amber-400">
              {result.value.toLocaleString()}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
              {feature.entity} {result.entity_id}
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
            <Meta label="staleness" value={formatDuration(result.staleness_seconds)} />
            <Meta label="lookup" value={`${result.lookup_ms} ms`} />
          </dl>
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">
        {label}
      </dt>
      <dd className="font-mono text-sm tabular-nums text-neutral-200">{value}</dd>
    </div>
  );
}

function Badge({ tone, children }) {
  const tones = {
    verified: "border-emerald-800 bg-emerald-950/40 text-emerald-400",
    ok: "border-neutral-700 bg-neutral-900 text-neutral-300",
    muted: "border-neutral-800 bg-neutral-900 text-neutral-500",
  };
  return (
    <span
      className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function formatDuration(seconds) {
  if (seconds == null) return "—";
  const days = Math.floor(seconds / 86400);
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(seconds / 3600);
  if (hours >= 1) return `${hours}h`;
  const minutes = Math.floor(seconds / 60);
  return minutes >= 1 ? `${minutes}m` : `${seconds}s`;
}