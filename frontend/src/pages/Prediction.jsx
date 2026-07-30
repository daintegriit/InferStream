import React from "react";
import InferenceForm from "../components/InferenceForm";
import ResultPanel from "../components/ResultPanel";
import PDFExportButton from "../components/PDFExportButton";

/**
 * Model comes from App via props, so the Navbar selector controls this form.
 *
 * Form and result sit side by side with the result column sticky: adjusting
 * an input and seeing the effect shouldn't require scrolling.
 *
 * SHAP and Copilot are omitted until shap_explainer.py stops using the input
 * row as its own background set -- until then its values collapse toward zero.
 */
export default function Prediction({ selectedModel, result, onResult }) {
  return (
    <div className="mx-auto max-w-[1600px] space-y-8 px-4">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-800 pb-6 pt-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-100">
            Prediction console
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-neutral-400">
            Fields are rendered from the model's own contract. Categorical options come from the
            fitted encoder, so an invalid value can't be submitted.
          </p>
        </div>
        <PDFExportButton model={selectedModel} result={result} />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <InferenceForm modelType={selectedModel} onResult={onResult} />
        </div>

        <div className="lg:col-span-7">
          <div className="lg:sticky lg:top-6">
            <ResultPanel result={result} />
          </div>
        </div>
      </div>
    </div>
  );
}