import React from "react";

const InferenceLog = ({ history }) => {
  if (!history.length) return null;

  return (
    <div className="mt-6 bg-gray-800 p-4 rounded">
      <h2 className="text-indigo-300 font-bold mb-2">📜 Inference History</h2>
      <ul className="text-sm">
        {history.map((entry, i) => (
          <li key={i} className="mb-1 border-b border-gray-700 pb-1">
            <strong>{entry.model}</strong> predicted:{" "}
            <code>{entry.prediction}</code> at {entry.time}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default InferenceLog;
