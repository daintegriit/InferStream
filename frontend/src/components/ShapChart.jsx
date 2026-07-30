import React from "react";
import ReactECharts from "echarts-for-react";

const ShapChart = ({ explanation }) => {
  // ===============================
  // Guards (CRITICAL)
  // ===============================
  if (
    !explanation ||
    !Array.isArray(explanation.features) ||
    !Array.isArray(explanation.contributions) ||
    explanation.features.length === 0 ||
    explanation.features.length !== explanation.contributions.length
  ) {
    return (
      <div className="mt-6 bg-surface-raised p-4 rounded shadow">
        <p className="text-content-secondary italic">
          No SHAP explanation available for this prediction.
        </p>
      </div>
    );
  }

  // ===============================
  // Prepare Data
  // ===============================
  const sorted = explanation.features
    .map((name, i) => ({
      name,
      value: Number(explanation.contributions[i]) || 0,
    }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 15); // keep chart readable

  const featureNames = sorted.map((f) => f.name);
  const values = sorted.map((f) => f.value);

  // ===============================
  // ECharts Option
  // ===============================
  const option = {
    title: {
      text: "🧠 SHAP Feature Contributions",
      left: "center",
      textStyle: { color: "#fff", fontSize: 16 },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params) => {
        const p = params[0];
        return `
          <strong>${p.name}</strong><br/>
          Contribution: ${p.value.toFixed(4)}
        `;
      },
    },
    grid: {
      left: "28%",
      right: "10%",
      top: 60,
      bottom: 40,
    },
    xAxis: {
      type: "value",
      axisLine: { lineStyle: { color: "#999" } },
      splitLine: { lineStyle: { color: "#333" } },
    },
    yAxis: {
      type: "category",
      data: featureNames,
      axisLine: { lineStyle: { color: "#999" } },
      axisLabel: { color: "#e5e7eb" },
    },
    series: [
      {
        name: "SHAP Impact",
        type: "bar",
        data: values,
        itemStyle: {
          color: (params) =>
            params.value >= 0 ? "#4f46e5" : "#ef4444",
        },
        label: {
          show: true,
          position: "right",
          color: "#fff",
          formatter: (p) => p.value.toFixed(3),
        },
      },
    ],
  };

  return (
    <div className="mt-6 bg-surface-raised p-4 rounded shadow">
      <ReactECharts option={option} style={{ height: "360px" }} />
    </div>
  );
};

export default ShapChart;