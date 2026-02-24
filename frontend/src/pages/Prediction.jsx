import React, { useState } from "react";
import InferenceForm from "../components/InferenceForm";
import PredictionResult from "../components/PredictionResult";
import AICopilot from "../components/AICopilot";
import ExplainabilityPanel from "../components/ExplainabilityPanel";
import ShapChart from "../components/ShapChart";
import PDFExportButton from "../components/PDFExportButton";

const Prediction = () => {
  const [result, setResult] = useState(null);
  const [model, setModel] = useState("xgboost");
  const [shapMode, setShapMode] = useState("bar");

  const handleResult = (res) => {
    setResult(res);
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen p-6">
      {/* 🔝 Toolbar */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-yellow-400">
          🧠 Prediction Console
        </h1>

        <PDFExportButton model={model} result={result} />
      </div>

      {/* 🧠 Inference Section */}
      <section className="bg-gray-800 p-6 rounded-lg shadow mb-8">
        <h2 className="text-2xl font-semibold mb-4">Run Prediction</h2>

        {/* IMPORTANT: model comes from page, not form */}
        <InferenceForm
          onResult={handleResult}
          modelType={model}
        />

        <PredictionResult data={result} />

        {result && (
          <p className="text-sm text-gray-400 mt-2">
            Model used:{" "}
            <span className="text-yellow-300 font-medium">{model}</span>
          </p>
        )}
      </section>

      {/* 📊 Explainability + SHAP */}
      {result && (
        <>
          <section className="bg-gray-800 p-6 rounded-lg shadow mb-8">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xl font-semibold">
                📊 Model Explainability
              </h3>

              <select
                className="bg-gray-700 text-white px-3 py-1 rounded"
                value={shapMode}
                onChange={(e) => setShapMode(e.target.value)}
              >
                <option value="bar">Bar</option>
                <option value="radar">Radar</option>
                <option value="raw">Raw JSON</option>
              </select>
            </div>

            {/* SHAP only renders when available */}
            {shapMode === "bar" && result.explanation && (
              <ShapChart explanation={result.explanation} />
            )}

            {shapMode === "radar" && (
              <p className="italic text-sm text-gray-400">
                Radar chart coming in Phase 2
              </p>
            )}

            {shapMode === "raw" && (
              <pre className="text-xs bg-black p-3 rounded overflow-x-auto max-h-64">
                {JSON.stringify(result.explanation || {}, null, 2)}
              </pre>
            )}
          </section>

          {/* 🧠 Explainability Narrative */}
          <ExplainabilityPanel explanation={result.explanation || null} />

          {/* 🤖 AI Copilot */}
          <AICopilot
            explanation={result.explanation || null}
            prediction={result.prediction}
            model={model}
          />
        </>
      )}
    </div>
  );
};

export default Prediction;