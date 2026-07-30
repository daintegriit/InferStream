import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import PDFExportButton from "./PDFExportButton";

const API = import.meta.env.VITE_API_URL || "http://localhost:8007";

const NAV_LINKS = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/predict", label: "Predict" },
  { path: "/features", label: "Features" },
  { path: "/metrics", label: "Metrics" },
  { path: "/logs", label: "Logs" },
];

export default function Navbar({ selectedModel, onChangeModel, result }) {
  const location = useLocation();
  const [models, setModels] = useState([]);

  // Model options come from what the server actually loaded, so the
  // selector can't offer something that 404s.
  useEffect(() => {
    fetch(`${API}/health`)
      .then((res) => res.json())
      .then((data) => {
        const loaded = data.models_loaded || [];
        setModels(loaded);
        if (loaded.length && !loaded.includes(selectedModel)) {
          onChangeModel(loaded[0]);
        }
      })
      .catch(() => setModels([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showExport =
    location.pathname === "/predict" || location.pathname === "/dashboard";

  return (
    <nav className="mb-6 flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-950 px-6 py-4 text-neutral-100 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-5">
        <Link to="/dashboard" className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-tight text-amber-400">
            InferStream
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-600">
            feature platform
          </span>
        </Link>

        <div className="flex flex-wrap gap-1">
          {NAV_LINKS.map((link) => {
            const active = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                aria-current={active ? "page" : undefined}
                className={`rounded px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                  active
                    ? "bg-neutral-800 text-neutral-100"
                    : "text-neutral-500 hover:text-neutral-200"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {showExport && <PDFExportButton model={selectedModel} result={result} />}
        <ThemeToggle />

        <label className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">
            model
          </span>
          <select
            value={selectedModel || ""}
            onChange={(e) => onChangeModel(e.target.value)}
            disabled={models.length === 0}
            className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 font-mono text-xs text-amber-400 focus:border-amber-500 focus:outline-none disabled:opacity-40"
          >
            {models.length === 0 ? (
              <option>none loaded</option>
            ) : (
              models.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))
            )}
          </select>
        </label>
      </div>
    </nav>
  );
}