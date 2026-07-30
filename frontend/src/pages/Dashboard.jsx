import React, { useEffect, useState } from "react";

import InferenceForm from "../components/InferenceForm";
import ResultPanel from "../components/ResultPanel";
import FeatureTable from "../components/FeatureTable";
import ModelComparisonPanel from "../components/ModelComparisonPanel";
import InferenceLog from "../components/InferenceLog";

const API = import.meta.env.VITE_API_URL || "http://localhost:8007";

/**
 * Layout: the form and its result sit side by side on wide screens, with the
 * result column sticky, so changing an input and seeing the effect doesn't
 * require scrolling. Everything below is reference material.
 */
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

  return (
    <div className="mx-auto max-w-[1600px] space-y-10 px-4">
      <header className="border-b border-neutral-800 pb-6 pt-2">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-100">
              Feature platform
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-neutral-400">
              Windowed features computed from an event log, served by entity key. The batch
              path that builds training sets and the streaming path that serves inference are
              asserted equal at a thousand historical points.
            </p>
          </div>

          {health ? (
            <dl className="flex gap-8">
              <Stat label="models" value={health.models_loaded?.length ?? 0} />
              <Stat label="features" value={health.features_materialized?.length ?? 0} />
              <Stat label="status" value={health.status} />
            </dl>
          ) : (
            <p className="font-mono text-[11px] uppercase tracking-widest text-red-400">
              API unreachable at {API}
            </p>
          )}
        </div>
      </header>

      {/* Action and outcome, visible together. */}
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
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
            Recent predictions
          </h2>
          <InferenceLog history={history} />
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
        {label}
      </dt>
      <dd className="mt-0.5 font-mono text-xl tabular-nums text-amber-400">{value}</dd>
    </div>
  );
}