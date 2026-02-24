import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "./pages/Layout";

import Dashboard from "./pages/Dashboard";
import Prediction from "./pages/Prediction";
import Metrics from "./pages/Metrics";
import Logs from "./pages/Logs";
import FeatureExplorer from "./pages/FeatureExplorer";

function App() {
  const [model, setModel] = useState("xgboost");

  return (
    <Router>
      <Routes>
        {/* Redirect root to Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" />} />

        {/* Dashboard overview */}
        <Route
          path="/dashboard"
          element={
            <Layout selectedModel={model} onChangeModel={setModel}>
              <Dashboard />
            </Layout>
          }
        />

        {/* Predict tab */}
        <Route
          path="/predict"
          element={
            <Layout selectedModel={model} onChangeModel={setModel}>
              <Prediction model={model} />
            </Layout>
          }
        />

        {/* Metrics */}
        <Route
          path="/metrics"
          element={
            <Layout selectedModel={model} onChangeModel={setModel}>
              <Metrics />
            </Layout>
          }
        />

        {/* Logs */}
        <Route
          path="/logs"
          element={
            <Layout selectedModel={model} onChangeModel={setModel}>
              <Logs />
            </Layout>
          }
        />

        {/* Feature Explorer */}
        <Route
          path="/features"
          element={
            <Layout selectedModel={model} onChangeModel={setModel}>
              <FeatureExplorer />
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
