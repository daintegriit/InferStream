import React from "react";
import MetricsPanel from "../components/MetricsPanel";
import ModelVersionPanel from "../components/ModelVersionPanel";

export default function Metrics() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="border-b border-surface-border pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-content">Metrics</h1>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-content-secondary">
          Runtime counters and model registration state.
        </p>
      </header>

      <ModelVersionPanel />
      <MetricsPanel />
    </div>
  );
}