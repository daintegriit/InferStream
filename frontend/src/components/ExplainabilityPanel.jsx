import React from "react";

const ExplainabilityPanel = ({ explanation }) => {
  if (!explanation) return null;

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-8">
      <h2 className="text-xl font-semibold mb-4">🧠 Explainability Panel</h2>

      <div className="mb-4">
        <p className="text-sm text-gray-400 mb-1">🔍 Raw Explanation (JSON)</p>
        <pre className="bg-gray-900 p-3 rounded text-xs overflow-x-auto max-h-64">
          {JSON.stringify(explanation, null, 2)}
        </pre>
      </div>

      {/* Future: Radar/Bar Chart for feature impact */}
      <div className="text-gray-300 italic text-sm">
        AI Copilot (placeholder): "This prediction was driven primarily by the
        user's high watch_time and genre preference."
      </div>
    </div>
  );
};

export default ExplainabilityPanel;
