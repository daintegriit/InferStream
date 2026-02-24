import React from "react";
import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import PDFExportButton from "./PDFExportButton";

const Navbar = ({ selectedModel, onChangeModel, result }) => {
  const location = useLocation();

  const navLinks = [
    { path: "/dashboard", label: "📊 Dashboard" },
    { path: "/predict", label: "🧠 Predict" },
    { path: "/metrics", label: "📈 Metrics" },
    { path: "/features", label: "🧬 Features" },
    { path: "/logs", label: "📝 Logs" },
  ];

  const showPDFExport =
    location.pathname === "/predict" ||
    location.pathname === "/dashboard";

  return (
    <nav className="flex flex-col md:flex-row justify-between items-center bg-gray-900 py-4 px-6 text-white rounded mb-6 shadow-md">
      {/* 🔗 Brand + Navigation */}
      <div className="flex flex-wrap items-center gap-4 mb-2 md:mb-0">
        <h1 className="text-2xl font-bold text-yellow-400 tracking-wide">
          ⚡ InferStream
        </h1>

        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`text-sm px-3 py-1 rounded transition ${
              location.pathname === link.path
                ? "bg-indigo-600 text-white"
                : "text-gray-300 hover:text-yellow-400"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* ⚙️ Action Bar */}
      <div className="flex items-center gap-3">
        {/* 📤 PDF Export (context-aware) */}
        {showPDFExport && (
          <PDFExportButton model={selectedModel} result={result} />
        )}

        {/* 🌓 Theme Toggle */}
        <ThemeToggle />

        {/* 🔽 Model Selector */}
        <label htmlFor="modelSelect" className="text-sm font-medium text-gray-300">
          Model:
        </label>
        <select
          id="modelSelect"
          value={selectedModel}
          onChange={(e) => onChangeModel(e.target.value)}
          className="bg-gray-700 border border-gray-500 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {["sklearn", "xgboost", "pytorch", "keras"].map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </nav>
  );
};

export default Navbar;