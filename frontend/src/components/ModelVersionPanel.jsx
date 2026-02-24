import React, { useEffect, useState } from "react";
import axios from "axios";

const ModelVersionPanel = () => {
  const [models, setModels] = useState([]);
  const [changelog, setChangelog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchModelInfo = async () => {
      try {
        // Fetch status (models + versions)
        const statusRes = await axios.get("http://localhost:8007/status");

        const availableModels = statusRes.data?.models_available || [];
        const versions = statusRes.data?.versions || {};

        setModels(
          availableModels.map((model) => ({
            name: model,
            version: versions[model] || "unknown",
          }))
        );

        // Fetch changelog
        const changeRes = await axios.get(
          "http://localhost:8007/status/changelog"
        );

        setChangelog(changeRes.data?.changelog || []);
      } catch (err) {
        console.error("Error fetching model info:", err);
        setError("Failed to load model version information.");
      } finally {
        setLoading(false);
      }
    };

    fetchModelInfo();
  }, []);

  if (loading) {
    return <p className="text-gray-400">Loading model information…</p>;
  }

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  return (
    <div className="space-y-6 bg-gray-900 p-6 rounded-lg shadow-md">
      {/* Available Models */}
      <div>
        <h3 className="text-lg font-semibold text-yellow-400 mb-2">
          📦 Available Models
        </h3>
        {models.length === 0 ? (
          <p className="text-gray-400 text-sm">No models registered.</p>
        ) : (
          <ul className="list-disc pl-5 text-sm text-gray-300">
            {models.map((m) => (
              <li key={m.name}>
                <span className="font-medium text-white">{m.name}</span>{" "}
                <span className="text-gray-400">—</span>{" "}
                <span className="text-green-300">{m.version}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Change Log */}
      <div>
        <h3 className="text-lg font-semibold text-yellow-400 mb-2">
          📝 Model Change Log
        </h3>
        {changelog.length === 0 ? (
          <p className="text-gray-400 text-sm">No changelog entries.</p>
        ) : (
          <ul className="text-sm text-gray-300 space-y-2">
            {changelog.map((entry, i) => (
              <li
                key={i}
                className="border-l-2 border-purple-500 pl-3"
              >
                <strong className="text-white">{entry.model}</strong>{" "}
                updated to{" "}
                <span className="text-green-300">{entry.version}</span>{" "}
                on{" "}
                <span className="text-blue-300">{entry.date}</span>
                <br />
                <span className="italic text-gray-400">
                  {entry.notes}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ModelVersionPanel;