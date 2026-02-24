import React from "react";
import MetricsPanel from "../components/MetricsPanel";
import ModelVersionPanel from "../components/ModelVersionPanel";

const Metrics = () => (
  <div className="bg-gray-900 text-white min-h-screen p-6">
    <h1 className="text-3xl font-bold mb-6">📈 System Metrics</h1>
    <ModelVersionPanel />
    <MetricsPanel />
  </div>
);

export default Metrics;
