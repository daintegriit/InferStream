import React from "react";
import InferenceLog from "../components/InferenceLog";
import LiveLogPanel from "../components/LiveLogPanel";

const Logs = () => {
  const history = []; // replace this with actual log state if needed
  return (
    <div className="bg-gray-900 text-white min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-6">📝 Inference Logs</h1>
      <LiveLogPanel />
      <InferenceLog history={history} />
    </div>
  );
};

export default Logs;