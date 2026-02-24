import React, { useState } from "react";
import axios from "axios";

const InferenceForm = ({ onResult, modelType }) => {
  const [loading, setLoading] = useState(false);

  /**
   * 🔑 Minimal user-facing inputs
   * Everything else is normalized to backend contract
   */
  const [formData, setFormData] = useState({
    age: 30,
    country: "US",
    subscription_type: "basic",
    avg_watch_time_per_day: 2,
    favorite_genre: "action",
  });

  const genreOptions = [
    "action",
    "comedy",
    "drama",
    "horror",
    "scifi",
    "documentary",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      /**
       * 🔐 BACKEND CONTRACT (MUST MATCH predict.py)
       */
      const features = {
        age: Number(formData.age),
        watch_hours: Number(formData.avg_watch_time_per_day) * 60,
        last_login_days: 3,
        monthly_fee:
          formData.subscription_type === "premium"
            ? 19.99
            : formData.subscription_type === "standard"
            ? 15.99
            : 13.99,
        number_of_profiles: 2,
        avg_watch_time_per_day: Number(formData.avg_watch_time_per_day),
        gender: "Male",                  // Phase 2: make user-selectable
        subscription_type: formData.subscription_type,
        region: formData.country || "US",
        device: "Mobile",
        payment_method: "Credit Card",
        favorite_genre: formData.favorite_genre,
        demographic: "unknown",          // REQUIRED for drift + fairness
      };

      const payload = {
        model: modelType,                // 🔥 single source of truth
        features,
      };

      const res = await axios.post(
        "http://localhost:8007/predict",
        payload
      );

      onResult(res.data);
    } catch (err) {
      console.error("Prediction error:", err);
      onResult({
        error:
          err.response?.data?.detail ||
          err.message ||
          "Prediction failed",
      });
    }

    setLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-gray-900 p-6 rounded-lg shadow text-white"
    >
      <h2 className="text-xl font-bold">🎯 Run Prediction</h2>

      {/* 🔒 Model Display (read-only, page controls it) */}
      <div className="text-sm text-gray-400">
        Model selected:{" "}
        <span className="text-yellow-300 font-medium">{modelType}</span>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          name="age"
          type="number"
          placeholder="Age"
          value={formData.age}
          onChange={handleChange}
          className="input"
          required
        />

        <input
          name="avg_watch_time_per_day"
          type="number"
          step="0.1"
          placeholder="Avg Watch Time / Day (hrs)"
          value={formData.avg_watch_time_per_day}
          onChange={handleChange}
          className="input"
          required
        />

        <input
          name="country"
          placeholder="Country"
          value={formData.country}
          onChange={handleChange}
          className="input"
        />
      </div>

      {/* Subscription */}
      <div>
        <label className="block mb-1">Subscription Type</label>
        <select
          name="subscription_type"
          value={formData.subscription_type}
          onChange={handleChange}
          className="w-full p-2 rounded bg-gray-800"
        >
          <option value="basic">Basic</option>
          <option value="standard">Standard</option>
          <option value="premium">Premium</option>
        </select>
      </div>

      {/* Favorite Genre */}
      <div>
        <label className="block mb-1">Favorite Genre</label>
        <select
          name="favorite_genre"
          value={formData.favorite_genre}
          onChange={handleChange}
          className="w-full p-2 rounded bg-gray-800"
        >
          {genreOptions.map((genre) => (
            <option key={genre} value={genre}>
              {genre.charAt(0).toUpperCase() + genre.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="mt-4 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white"
        disabled={loading}
      >
        {loading ? "Predicting..." : "Submit"}
      </button>
    </form>
  );
};

export default InferenceForm;