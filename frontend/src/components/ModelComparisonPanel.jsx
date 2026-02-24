import React, { useState } from "react";

const MODELS = ["sklearn", "xgboost"];

const ModelComparisonPanel = () => {
  const [inputs, setInputs] = useState({
    user_age: 30,
    watch_time: 120, // minutes
    gender: "Male",
    shapMode: "bar",
  });

  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setInputs({ ...inputs, [e.target.name]: e.target.value });
  };

  const handleCompare = async () => {
    setLoading(true);
    setResults({});

    // 🔐 MUST MATCH TRAINING FEATURES EXACTLY
    const baseFeatures = {
      age: Number(inputs.user_age),
      watch_hours: Number(inputs.watch_time),
      last_login_days: 3,
      monthly_fee: 13.99,
      number_of_profiles: 2,
      avg_watch_time_per_day: Number(inputs.watch_time) / 60,
      gender: inputs.gender || "Male",
      subscription_type: "Basic",
      region: "North America",
      device: "Mobile",
    };

    const newResults = {};

    for (const model of MODELS) {
      try {
        const res = await fetch("http://localhost:8007/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            features: baseFeatures,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          console.error(`❌ ${model} error`, err);
          newResults[model] = "ERR";
          continue;
        }

        const data = await res.json();
        newResults[model] = data.prediction;
      } catch (err) {
        console.error(`❌ ${model} failed`, err);
        newResults[model] = "ERR";
      }
    }

    setResults(newResults);
    setLoading(false);
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-6">
      <h2 className="text-xl font-semibold text-yellow-400 mb-4">
        🧠 Model Comparison Panel
      </h2>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <input
          type="number"
          name="user_age"
          value={inputs.user_age}
          onChange={handleChange}
          className="px-3 py-2 rounded bg-gray-700 text-white"
          placeholder="User Age"
        />

        <input
          type="number"
          name="watch_time"
          value={inputs.watch_time}
          onChange={handleChange}
          className="px-3 py-2 rounded bg-gray-700 text-white"
          placeholder="Watch Time (min)"
        />

        <select
          name="gender"
          value={inputs.gender}
          onChange={handleChange}
          className="px-3 py-2 rounded bg-gray-700 text-white"
        >
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Compare Button */}
      <button
        onClick={handleCompare}
        disabled={loading}
        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded shadow"
      >
        {loading ? "Comparing..." : "Compare All Models"}
      </button>

      {/* Results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        {MODELS.map((model) => (
          <div
            key={model}
            className="bg-gray-700 p-3 rounded text-white shadow-md"
          >
            <h3 className="font-semibold capitalize">{model}</h3>
            <p className="text-sm">
              🔮 Prediction:{" "}
              <span className="font-bold">
                {results[model] !== undefined ? results[model] : "--"}
              </span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              SHAP: available in single-model view
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModelComparisonPanel;