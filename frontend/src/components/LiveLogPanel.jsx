import React, { useEffect, useState } from "react";

const LiveLogPanel = () => {
  const [log, setLog] = useState(null);

  useEffect(() => {
    const fetchLog = () => {
      fetch("http://localhost:8007/logs/latest")
        .then((res) => res.json())
        .then((data) => setLog(data));
    };

    fetchLog();
    const interval = setInterval(fetchLog, 5000); // refresh every 5 sec
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-8">
      <h2 className="text-xl font-semibold mb-2">🔁 Live Inference Log</h2>
      {log ? (
        <pre className="text-xs bg-black p-3 rounded overflow-x-auto">
          {JSON.stringify(log, null, 2)}
        </pre>
      ) : (
        <p className="text-gray-400">Waiting for logs...</p>
      )}
    </div>
  );
};

export default LiveLogPanel;
