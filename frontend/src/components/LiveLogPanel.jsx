import React, { useEffect, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";

const API = import.meta.env.VITE_API_URL || "http://localhost:8007";
const POLL_MS = 5000;

export default function LiveLogPanel() {
  const [log, setLog] = useState(null);
  const [error, setError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`${API}/logs/latest`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setLog(data);
        setError(null);
        setFetchedAt(new Date().toLocaleTimeString());
      } catch (e) {
        if (cancelled) return;
        setError(`/logs/latest returned ${e.message}`);
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
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-5">
      <header className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
          <FiRefreshCw aria-hidden />
          polling every {POLL_MS / 1000}s
        </span>
        {fetchedAt && (
          <span className="font-mono text-[11px] tabular-nums text-neutral-600">
            {fetchedAt}
          </span>
        )}
      </header>

      {error && (
        <p className="rounded border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs leading-relaxed text-neutral-400">
          {error}
        </p>
      )}

      {!error && !log && (
        <p className="text-sm text-neutral-500">No entries yet.</p>
      )}

      {!error && log && (
        <pre className="max-h-72 overflow-auto rounded bg-neutral-900/60 p-3 font-mono text-xs leading-relaxed text-neutral-300">
          {JSON.stringify(log, null, 2)}
        </pre>
      )}
    </div>
  );
}