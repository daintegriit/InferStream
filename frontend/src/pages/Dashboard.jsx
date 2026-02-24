import React, { useState, useEffect } from "react";

import InferenceForm from "../components/InferenceForm";
import PredictionResult from "../components/PredictionResult";
import MetricsPanel from "../components/MetricsPanel";
import ShapChart from "../components/ShapChart";
import InferenceLog from "../components/InferenceLog";
import FeatureSummaryChart from "../components/FeatureSummaryChart";
import FeatureTable from "../components/FeatureTable";
import ExplainabilityPanel from "../components/ExplainabilityPanel";
import AICopilot from "../components/AICopilot";
import ModelVersionPanel from "../components/ModelVersionPanel";
import FairnessChart from "../components/FairnessChart";
import ModelComparisonPanel from "../components/ModelComparisonPanel";
import DriftChart from "../components/DriftChart";

const Dashboard = () => {
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [model, setModel] = useState("xgboost");
  const [featureMeta, setFeatureMeta] = useState([]);
  const [shapMode, setShapMode] = useState("bar");

  /* ============================
     Feature Registry Fetch
     ============================ */
  const fetchFeatures = async () => {
    try {
      const res = await fetch("http://localhost:8007/features/");
      const data = await res.json();

      if (!Array.isArray(data)) {
        console.error("❌ /features did not return array:", data);
        return;
      }

      const meta = data.map((f) => ({
        name: f.name,
        type: f.type,
        example: f.example ?? "—",
        tags: f.tags ?? [],
        source: f.source ?? "N/A",
        updated_at: new Date(f.last_updated),
      }));

      setFeatureMeta(meta);
    } catch (err) {
      console.error("❌ Failed to fetch features:", err);
    }
  };

  /* ============================
     Prediction Handler
     ============================ */
  const handleResult = (res) => {
    setResult(res);

    if (!res?.error && res?.prediction !== undefined) {
      setHistory((prev) => [
        ...prev,
        {
          model: res.model,
          prediction: res.prediction,
          time: new Date().toLocaleTimeString(),
        },
      ]);
    }
  };

  /* ============================
     Initial Load
     ============================ */
  useEffect(() => {
    fetchFeatures();
    const interval = setInterval(fetchFeatures, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-900 text-white min-h-screen p-6">
      {/* 🚀 Header */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-yellow-400">⚡ InferStream</h1>
        <p className="text-gray-400">
          Production-Grade Inference, Explainability & Fairness Platform
        </p>
      </header>

      {/* 🧠 Model Comparison */}
      <ModelComparisonPanel />

      {/* 🧠 Prediction */}
      <section className="bg-gray-800 p-4 rounded-lg shadow mb-8">
        <h2 className="text-2xl font-semibold mb-4">Run Prediction</h2>

        <InferenceForm onResult={handleResult} />

        <PredictionResult data={result} />

        {result && <FairnessChart result={result} />}
      </section>

      {/* 📊 SHAP */}
      {result?.explanation && (
        <section className="bg-gray-800 p-4 rounded-lg shadow mb-8">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold">📊 SHAP Explanation</h2>
            <select
              className="bg-gray-700 px-3 py-1 rounded"
              value={shapMode}
              onChange={(e) => setShapMode(e.target.value)}
            >
              <option value="bar">Bar</option>
              <option value="raw">Raw JSON</option>
            </select>
          </div>

          {shapMode === "bar" && (
            <ShapChart explanation={result.explanation} />
          )}

          {shapMode === "raw" && (
            <pre className="text-xs bg-black p-3 rounded overflow-x-auto max-h-72">
              {JSON.stringify(result.explanation, null, 2)}
            </pre>
          )}

          <ExplainabilityPanel explanation={result.explanation} />
          <AICopilot explanation={result.explanation} model={result.model} />
        </section>
      )}

      {/* 📊 Feature Registry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">
            📊 Feature Freshness Summary
          </h2>
          <FeatureSummaryChart features={featureMeta} />
        </div>

        <div className="bg-gray-800 p-4 rounded-lg shadow overflow-x-auto">
          <h2 className="text-xl font-semibold mb-2">
            📋 Feature Registry Table
          </h2>
          <FeatureTable features={featureMeta} />
        </div>
      </div>

      {/* 🧪 Model Versions */}
      <section className="bg-gray-800 p-4 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-2">
          🧪 Model Versioning & Change Log
        </h2>
        <ModelVersionPanel />
      </section>

      {/* 📈 Metrics */}
      <section className="bg-gray-800 p-4 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-2">📈 System Metrics</h2>
        <MetricsPanel />
      </section>

      {/* 🔁 Drift */}
      <section className="bg-gray-800 p-4 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-2">📉 Prediction Drift</h2>
        <DriftChart />
      </section>

      {/* 📝 History */}
      <section className="bg-gray-800 p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-2">📝 Inference History</h2>
        <InferenceLog history={history} />
      </section>
    </div>
  );
};

export default Dashboard;