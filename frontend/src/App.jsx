import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Layout from "./pages/Layout";
import Dashboard from "./pages/Dashboard";
import Prediction from "./pages/Prediction";
import FeatureExplorer from "./pages/FeatureExplorer";
import Metrics from "./pages/Metrics";
import Logs from "./pages/Logs";

/**
 * Single source of truth for model selection and the latest result.
 *
 * Previously Dashboard, Prediction and Layout each kept their own copy, so
 * the Navbar selector changed one while the forms read another.
 */
export default function App() {
  const [selectedModel, setSelectedModel] = useState("xgboost");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  function handleResult(res) {
    setResult(res);
    if (res?.prediction !== undefined) {
      setHistory((prev) => [
        {
          model: res.model,
          prediction: res.prediction,
          probability: res.probability,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
    }
  }

  // Switching models invalidates the current result -- it was produced by a
  // different contract, and FairnessChart would sweep it against the wrong one.
  function handleChangeModel(next) {
    setSelectedModel(next);
    setResult(null);
  }

  return (
    <BrowserRouter>
      <Layout
        selectedModel={selectedModel}
        onChangeModel={handleChangeModel}
        result={result}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <Dashboard
                selectedModel={selectedModel}
                result={result}
                onResult={handleResult}
              />
            }
          />
          <Route
            path="/predict"
            element={
              <Prediction
                selectedModel={selectedModel}
                result={result}
                onResult={handleResult}
              />
            }
          />
          <Route path="/features" element={<FeatureExplorer />} />
          <Route path="/metrics" element={<Metrics />} />
          <Route path="/logs" element={<Logs history={history} />} />
          <Route
            path="*"
            element={
              <p className="font-mono text-sm text-neutral-500">
                No page at this address.
              </p>
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}