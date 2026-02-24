import React, { useEffect, useState } from "react";

const AICopilot = ({ explanation, prediction }) => {
  const [response, setResponse] = useState("");

  useEffect(() => {
    if (explanation && prediction) {
      fetch("http://localhost:8007/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ explanation, prediction }),
      })
        .then((res) => res.json())
        .then((data) => setResponse(data.copilot_response));
    }
  }, [explanation, prediction]);

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-8">
      <h2 className="text-xl font-semibold mb-2">🤖 AI Copilot</h2>
      <p className="text-gray-300 text-sm whitespace-pre-wrap">
        {response || "Loading explanation..."}
      </p>
    </div>
  );
};

export default AICopilot;
