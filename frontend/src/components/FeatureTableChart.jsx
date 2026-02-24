import React from "react";
import ReactECharts from "echarts-for-react";

const FeatureTableChart = ({ features }) => {
  if (!features || features.length === 0) return null;

  const option = {
    title: {
      text: "📊 Feature Overview",
      left: "center",
      textStyle: { color: "#fff" },
    },
    tooltip: { trigger: "axis" },
    legend: { data: ["Example Value"], textStyle: { color: "#fff" } },
    xAxis: {
      type: "category",
      data: features.map((f) => f.name),
      axisLabel: { rotate: 45 },
      axisLine: { lineStyle: { color: "#999" } },
    },
    yAxis: {
      type: "value",
      axisLine: { lineStyle: { color: "#999" } },
    },
    series: [
      {
        name: "Example Value",
        type: "bar",
        data: features.map((f) =>
          typeof f.example === "number" ? f.example : 0
        ),
        itemStyle: { color: "#4f46e5" },
      },
    ],
  };

  return (
    <div className="mt-6 bg-gray-800 p-4 rounded-lg">
      <ReactECharts option={option} style={{ height: "300px" }} />
    </div>
  );
};

export default FeatureTableChart;
