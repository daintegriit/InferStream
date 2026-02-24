import React, { useEffect, useState } from "react";
import axios from "axios";

const MetricsPanel = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = async () => {
    try {
      const res = await axios.get("http://localhost:8007/metrics");
      setMetrics(res.data);
      setError(null);
    } catch (err) {
      console.error("Metrics fetch failed:", err);
      setError("❌ Failed to fetch system metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-800 p-4 rounded-lg mt-8 text-sm shadow-md">
      <h2 className="text-indigo-300 text-lg font-semibold mb-3">
        📊 Model System Metrics
      </h2>

      {loading && (
        <p className="text-gray-400">Loading metrics…</p>
      )}

      {error && (
        <p className="text-red-400">{error}</p>
      )}

      {!loading && !error && metrics && (
        <pre className="text-gray-300 whitespace-pre-wrap break-all bg-gray-900 p-3 rounded">
          {JSON.stringify(metrics, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default MetricsPanel;