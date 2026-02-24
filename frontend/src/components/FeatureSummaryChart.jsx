import React from "react";
import ReactECharts from "echarts-for-react";

const FeatureSummaryChart = ({ features = [] }) => {
  if (!features.length) {
    return <p className="text-gray-400">No feature data to display</p>;
  }

  /**
   * ✅ Backend contract:
   * - name
   * - last_updated (ISO string)
   */
  const yAxisData = features.map((f) => f.name);

  const seriesData = features.map((f) => {
    const time = new Date(f.last_updated).getTime();
    return isNaN(time) ? 0 : time;
  });

  const option = {
    title: {
      text: "📡 Feature Last Updated",
      left: "center",
      textStyle: {
        color: "#e5e7eb", // slate-200
        fontSize: 16,
        fontWeight: "bold",
      },
    },
    grid: {
      left: "20%",
      right: "5%",
      top: "15%",
      bottom: "10%",
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params) => {
        const idx = params[0].dataIndex;
        const f = features[idx];
        return `
          <strong>${f.name}</strong><br/>
          Last updated:<br/>
          ${new Date(f.last_updated).toLocaleString()}
        `;
      },
    },
    xAxis: {
      type: "time",
      axisLine: { lineStyle: { color: "#64748b" } },
      axisLabel: { color: "#94a3b8" },
    },
    yAxis: {
      type: "category",
      data: yAxisData,
      axisLabel: { color: "#e5e7eb" },
      axisLine: { lineStyle: { color: "#64748b" } },
    },
    series: [
      {
        name: "Last Updated",
        type: "bar",
        data: seriesData,
        itemStyle: { color: "#38bdf8" }, // sky-400
        barWidth: "60%",
      },
    ],
  };

  return (
    <div className="bg-gray-900 p-4 rounded-xl shadow-md">
      <ReactECharts
        option={option}
        style={{ height: "350px", width: "100%" }}
      />
    </div>
  );
};

export default FeatureSummaryChart;