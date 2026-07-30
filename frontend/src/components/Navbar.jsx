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
    <nav className="flex flex-col gap-3 border-b border-surface-border bg-surface-raised px-6 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-5">
        {/* The wordmark is the one place red is pure identity rather than data. */}
        <Link to="/dashboard" className="flex items-baseline gap-2">
          <span className="text-lg font-bold tracking-tight text-risk">InferStream</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-content-muted">
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
                className={`rounded px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition focus:outline-none focus-visible:ring-2 focus-visible:ring-risk ${
                  active
                    ? "bg-risk text-white"
                    : "text-content-muted hover:text-content"
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
          <span className="font-mono text-[11px] uppercase tracking-wider text-content-muted">
            model
          </span>
          <select
            value={selectedModel || ""}
            onChange={(e) => onChangeModel(e.target.value)}
            disabled={models.length === 0}
            className="rounded border border-surface-border bg-surface-base px-2 py-1 font-mono text-xs text-content focus:border-risk focus:outline-none disabled:opacity-40"
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