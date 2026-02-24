import React from "react";
import ShapChart from "./ShapChart";

const PredictionResult = ({ data }) => {
  if (!data) return null;

  if (data.error) {
    return (
      <div className="bg-red-100 text-red-800 p-4 rounded mt-4">
        ⚠️ Prediction unavailable: <strong>{data.error}</strong>
      </div>
    );
  }

  const {
    model = "N/A",
    prediction = "Unavailable",
    confidence = null,
    explanation = null,
  } = data;

  return (
    <div className="mt-6 bg-gray-800 p-5 rounded-xl space-y-4 text-white shadow-lg">
      <h3 className="text-lg font-semibold text-green-300">✅ Inference Result</h3>

      <div className="text-sm">
        <p>
          <strong className="text-white">🧠 Model:</strong>{" "}
          <span className="text-yellow-300 uppercase">{model}</span>
        </p>
        <p>
          <strong className="text-white">📈 Prediction:</strong>{" "}
          <span className="text-cyan-300 font-semibold">{prediction}</span>
        </p>
        {confidence !== null && (
          <p>
            <strong className="text-white">🔍 Confidence:</strong>{" "}
            <span className="text-pink-300">{(confidence * 100).toFixed(2)}%</span>
          </p>
        )}
      </div>

      {explanation && (
        <div className="bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-indigo-300 font-bold mb-2">
            🔍 Top Feature Contributions (SHAP)
          </p>
          <ul className="text-sm text-gray-200 space-y-1">
            {explanation.features.map((feat, i) => (
              <li key={i}>
                {feat}:{" "}
                <span className="text-emerald-300">
                  {explanation.contributions[i].toFixed(4)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <ShapChart explanation={explanation} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionResult;