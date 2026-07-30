import React from "react";
import { FiFileText } from "react-icons/fi";
import { exportInferenceToPDF } from "../utils/exportToPDF";

/**
 * Disabled until there's a result. Previously `result` was never lifted into
 * App, so this always fired with undefined and produced an empty document.
 */
export default function PDFExportButton({ model, result }) {
  const ready = Boolean(result && !result.error);

  return (
    <button
      onClick={() => exportInferenceToPDF({ model, result })}
      disabled={!ready}
      title={ready ? "Export this prediction" : "Run a prediction first"}
      className="flex items-center gap-2 rounded border border-surface-border bg-surface-raised px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-content-secondary transition hover:text-content focus:outline-none focus-visible:ring-2 focus-visible:ring-risk disabled:cursor-not-allowed disabled:opacity-30"
    >
      <FiFileText aria-hidden />
      Export PDF
    </button>
  );
}