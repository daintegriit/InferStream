import React from "react";
import Navbar from "../components/Navbar";

/**
 * Owns page chrome and the single source of vertical rhythm. Pages should
 * not add their own outer padding -- previously Navbar's mb-8, this main's
 * p-6, and each page's header padding all stacked.
 */
export default function Layout({ children, selectedModel, onChangeModel, result }) {
  return (
    <div className="min-h-screen bg-surface-base text-content">
      <Navbar
        selectedModel={selectedModel}
        onChangeModel={onChangeModel}
        result={result}
      />
      <main className="pt-2 pb-16">{children}</main>
    </div>
  );
}