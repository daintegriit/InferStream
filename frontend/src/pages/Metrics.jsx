import React from "react";
import MetricsPanel from "../components/MetricsPanel";
import ModelVersionPanel from "../components/ModelVersionPanel";

export default function Metrics() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="border-b border-neutral-800 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-100">Metrics</h1>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-neutral-400">
          Runtime counters and model registration state.
        </p>
      </header>

      <ModelVersionPanel />
      <MetricsPanel />
    </div>
  );
}