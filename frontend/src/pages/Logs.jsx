import React from "react";
import InferenceLog from "../components/InferenceLog";
import LiveLogPanel from "../components/LiveLogPanel";

/**
 * Two different logs, deliberately separated:
 *
 *   Session  -- predictions made in this browser tab, held in App state.
 *               Cleared on refresh.
 *   Server   -- what the backend recorded via state/prediction_store,
 *               polled from /logs/latest. Survives refresh, shared across
 *               clients.
 *
 * The old version hardcoded `const history = []`, so the session list
 * rendered null unconditionally.
 */
export default function Logs({ history = [] }) {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="border-b border-surface-border pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-content">
          Inference logs
        </h1>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-content-secondary">
          Session history is local to this tab. The server log is what the backend recorded and
          persists across clients.
        </p>
      </header>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-widest text-content-muted">
            This session
          </h2>
          <span className="font-mono text-[11px] tabular-nums text-content-muted">
            {history.length} {history.length === 1 ? "prediction" : "predictions"}
          </span>
        </div>

        {history.length === 0 ? (
          <p className="rounded-lg border border-surface-border bg-surface-base px-4 py-6 text-sm text-content-muted">
            Nothing yet. Run a prediction and it will appear here.
          </p>
        ) : (
          <InferenceLog history={history} />
        )}
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-content-muted">
          Server log
        </h2>
        <LiveLogPanel />
      </section>
    </div>
  );
}