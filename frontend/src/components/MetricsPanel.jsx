import React, { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8007";
const POLL_MS = 15000;

export default function MetricsPanel() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`${API}/metrics`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setMetrics(data);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(`/metrics returned ${e.message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="rounded-lg border border-surface-border bg-surface-base p-5">
      <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-content-muted">
        System metrics
      </h2>

      {loading && <p className="text-sm text-content-muted">Loading…</p>}

      {error && (
        <p className="rounded border border-surface-border bg-surface-raised/60 px-3 py-2 text-xs leading-relaxed text-content-secondary">
          {error}
        </p>
      )}

      {!loading && !error && metrics && (
        <pre className="max-h-80 overflow-auto rounded bg-surface-raised/60 p-3 font-mono text-xs leading-relaxed text-content-secondary">
          {JSON.stringify(metrics, null, 2)}
        </pre>
      )}
    </div>
  );
}