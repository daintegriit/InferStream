import React, { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";

const DriftChart = () => {
  const [data, setData] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8007/drift/", {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Drift fetch failed (${res.status}): ${body}`);
        }
        return res.json();
      })
      .then(setData)
      .catch((e) => {
        console.error("DriftChart fetch failed:", e);
        setErr(String(e.message || e));
      });
  }, []);

  if (err) return <p className="text-red-400">DriftChart error: {err}</p>;
  if (!data || data.length === 0)
    return <p className="text-gray-400">Loading drift chart...</p>;

  const demographics = [...new Set(data.map((d) => d.demographic))];
  const genders = [...new Set(data.map((d) => d.gender))];

  const series = genders.map((gender) => ({
    name: gender,
    type: "bar",
    data: demographics.map((demo) => {
      const entry = data.find((d) => d.demographic === demo && d.gender === gender);
      return entry ? entry.avg_prediction : 0;
    }),
  }));

  const option = {
    title: {
      text: "📊 Inference Drift by Demographic & Gender",
      left: "center",
      textStyle: { color: "#fff", fontSize: 16 },
    },
    tooltip: { trigger: "axis" },
    legend: { top: 30, textStyle: { color: "#ccc" } },
    xAxis: { type: "category", data: demographics, axisLabel: { color: "#ccc" } },
    yAxis: { type: "value", axisLabel: { color: "#ccc" } },
    series,
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md mt-8">
      <ReactECharts option={option} style={{ height: "400px" }} />
      <p className="text-xs text-gray-400 mt-2">
        Based on in-memory prediction logs (Phase 2). Run “Compare All Models” a few times to populate drift buckets.
      </p>
    </div>
  );
};

export default DriftChart;