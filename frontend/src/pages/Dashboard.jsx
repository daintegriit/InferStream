import React, { useEffect, useState } from "react";

import InferenceForm from "../components/InferenceForm";
import ResultPanel from "../components/ResultPanel";
import FeatureTable from "../components/FeatureTable";
import ModelComparisonPanel from "../components/ModelComparisonPanel";
import InferenceLog from "../components/InferenceLog";

const API = import.meta.env.VITE_API_URL || "http://localhost:8007";

export default function Dashboard({ selectedModel, result, onResult }) {
  const [history, setHistory] = useState([]);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch(`${API}/health`)
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  function handleResult(res) {
    onResult(res);
    if (res?.prediction !== undefined) {
      setHistory((prev) =>
        [
          {
            model: res.model,
            prediction: res.prediction,
            probability: res.probability,
            time: new Date().toLocaleTimeString(),
          },
          ...prev,
        ].slice(0, 12)
      );
    }
  }

  const degraded = health && health.status !== "ok";

  return (
    <div className="mx-auto max-w-[1600px] space-y-10 px-6">
      <header className="border-b border-surface-border pb-5">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-content">
              Feature platform
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-content-secondary">
              Windowed features computed from an event log, served by entity key. The batch
              path that builds training sets and the streaming path that serves inference are
              asserted equal at a thousand historical points.
            </p>
          </div>

          {health ? (
            <dl className="flex gap-8">
              <Stat label="models" value={health.models_loaded?.length ?? 0} />
              <Stat label="features" value={health.features_materialized?.length ?? 0} />
              <Stat label="status" value={health.status} alert={degraded} />
            </dl>
          ) : (
            <p className="font-mono text-[11px] uppercase tracking-widest text-risk">
              API unreachable at {API}
            </p>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <InferenceForm modelType={selectedModel} onResult={handleResult} />
        </div>

        <div className="lg:col-span-7">
          <div className="lg:sticky lg:top-6">
            <ResultPanel result={result} />
          </div>
        </div>
      </div>

      <FeatureTable />

      <ModelComparisonPanel />

      {history.length > 0 && (
        <section>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-content-muted">
            Recent predictions
          </h2>
          <InferenceLog history={history} />
        </section>
      )}
    </div>
  );
}

/** Red here would mean "something is wrong" -- so it only appears when it is. */
function Stat({ label, value, alert = false }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-widest text-content-muted">
        {label}
      </dt>
      <dd
        className={`mt-0.5 font-mono text-xl tabular-nums ${
          alert ? "text-risk" : "text-content"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}