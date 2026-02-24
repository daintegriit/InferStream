import React, { useEffect, useState } from "react";

const FairnessChart = ({ result }) => {
  const [fairness, setFairness] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!result?.model || !result?.features) return;

    setFairness(null);
    setError(null);

    fetch("http://localhost:8007/predict/fairness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: result.model,
        features: result.features
      })
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((json) => {
        if (!json.fairness_check) {
          throw new Error("Invalid fairness response");
        }
        setFairness(json.fairness_check);
      })
      .catch((err) => {
        console.error("❌ Fairness audit failed:", err);
        setError("Fairness audit failed");
      });
  }, [result]);

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md mt-6">
      <h2 className="text-xl font-semibold mb-4 text-white">
        ⚖️ Individual Fairness Check
      </h2>

      {error && (
        <p className="text-red-400">{error}</p>
      )}

      {!fairness && !error && (
        <p className="text-gray-400 italic">Run a prediction to audit fairness.</p>
      )}

      {fairness && (
        <table className="w-full table-auto border border-gray-700 text-white">
          <tbody>
            <tr className="border-b border-gray-700">
              <td className="px-4 py-2 font-semibold">Attribute</td>
              <td className="px-4 py-2">{fairness.attribute}</td>
            </tr>
            <tr className="border-b border-gray-700">
              <td className="px-4 py-2 font-semibold">Base Gender</td>
              <td className="px-4 py-2">{fairness.base_gender}</td>
            </tr>
            <tr className="border-b border-gray-700">
              <td className="px-4 py-2 font-semibold">Alt Gender</td>
              <td className="px-4 py-2">{fairness.alt_gender}</td>
            </tr>
            <tr className="border-b border-gray-700">
              <td className="px-4 py-2 font-semibold">Base Prediction</td>
              <td className="px-4 py-2">{fairness.base_prediction}</td>
            </tr>
            <tr className="border-b border-gray-700">
              <td className="px-4 py-2 font-semibold">Alt Prediction</td>
              <td className="px-4 py-2">{fairness.alt_prediction}</td>
            </tr>
            <tr className="border-b border-gray-700">
              <td className="px-4 py-2 font-semibold">Delta</td>
              <td className="px-4 py-2">{fairness.delta}</td>
            </tr>
            <tr>
              <td className="px-4 py-2 font-semibold">Fair?</td>
              <td className={`px-4 py-2 font-bold ${fairness.is_fair ? "text-green-400" : "text-red-400"}`}>
                {fairness.is_fair ? "YES" : "NO"}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
};

export default FairnessChart;