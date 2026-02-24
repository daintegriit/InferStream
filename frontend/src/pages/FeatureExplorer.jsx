import React, { useEffect, useState } from "react";
import FeatureSummaryChart from "../components/FeatureSummaryChart";
import FeatureTable from "../components/FeatureTable";

const FeatureExplorer = () => {
  const [features, setFeatures] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const res = await fetch("http://localhost:8007/features/");
        const data = await res.json();

        if (!Array.isArray(data)) {
          throw new Error("Invalid feature data format");
        }

        const formatted = data.map((f) => ({
          name: f.name,
          type: f.type,
          example: f.example ?? "—",
          tags: f.tags ?? [],
          source: f.source ?? "unknown",
          updated_at: new Date(f.last_updated),
        }));

        setFeatures(formatted);
      } catch (err) {
        console.error("❌ Failed to fetch features:", err);
        setError("Failed to load feature metadata.");
      } finally {
        setLoading(false);
      }
    };

    fetchFeatures();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800 p-8">
      <h2 className="text-3xl font-bold mb-6 text-slate-700 dark:text-slate-100 text-center">
        📊 Feature Registry & Freshness
      </h2>

      {loading && (
        <p className="text-center text-slate-400">
          Loading feature metadata…
        </p>
      )}

      {error && (
        <div className="text-red-500 text-center font-medium">{error}</div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <FeatureSummaryChart features={features} />
          <FeatureTable features={features} />
        </div>
      )}
    </div>
  );
};

export default FeatureExplorer;