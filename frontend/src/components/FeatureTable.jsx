import React, { useState } from "react";

const downloadCSV = (data, filename = "features.csv") => {
  const header = [
    "name",
    "type",
    "example",
    "tags",
    "source",
    "last_updated",
  ].join(",");

  const rows = data.map((row) =>
    [
      row.name,
      row.type,
      row.example,
      (row.tags || []).join("|"),
      row.source || "N/A",
      row.last_updated,
    ].join(",")
  );

  const csv = [header, ...rows].join("\n");

  const link = document.createElement("a");
  link.setAttribute(
    "href",
    `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
  );
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const FeatureTable = ({ features = [] }) => {
  const [search, setSearch] = useState("");

  const filtered = features.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="mt-10 max-w-screen-xl mx-auto px-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-200">
          📊 Feature Freshness Table
        </h2>

        <div className="flex gap-2 mt-2 sm:mt-0">
          <input
            type="text"
            placeholder="Search features..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1 rounded-md text-sm bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => downloadCSV(filtered)}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md shadow"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md shadow border border-gray-700">
        <table className="min-w-full table-fixed text-sm text-left text-gray-200">
          <thead className="bg-gray-800">
            <tr>
              {[
                "Feature",
                "Type",
                "Example",
                "Tags",
                "Source",
                "Last Updated",
              ].map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 font-semibold border-b border-gray-700"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filtered.length > 0 ? (
              filtered.map((f, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-gray-700 transition-colors border-t border-gray-700"
                >
                  <td className="px-4 py-3">{f.name}</td>
                  <td className="px-4 py-3">{f.type}</td>
                  <td className="px-4 py-3">{String(f.example)}</td>
                  <td className="px-4 py-3">
                    {(f.tags || []).join(", ")}
                  </td>
                  <td className="px-4 py-3">{f.source || "N/A"}</td>
                  <td className="px-4 py-3">
                    {new Date(f.last_updated).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="px-4 py-6 text-center text-gray-400"
                  colSpan={6}
                >
                  No matching features found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default FeatureTable;