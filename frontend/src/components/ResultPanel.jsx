import React from "react";
import PredictionResult from "./PredictionResult";
import FairnessChart from "./FairnessChart";

/**
 * The result stack: outcome, then a counterfactual sweep. Shared so the
 * dashboard and the console can't drift apart.
 */
export default function ResultPanel({ result }) {
  if (!result) {
    return (
      <div className="flex min-h-[16rem] items-center justify-center rounded-lg border border-dashed border-neutral-800 bg-neutral-950/50 p-8">
        <div className="max-w-xs text-center">
          <p className="font-mono text-[11px] uppercase tracking-widest text-neutral-600">
            No prediction yet
          </p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            Fill the form and predict. The result and a counterfactual sweep across any
            categorical feature will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PredictionResult data={result} />
      {!result.error && <FairnessChart result={result} />}
    </div>
  );
}