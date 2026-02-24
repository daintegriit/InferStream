import React from "react";
import { exportInferenceToPDF } from "../utils/exportToPDF";

const PDFExportButton = ({ model, result }) => {
  return (
    <button
      onClick={() => exportInferenceToPDF({ model, result })}
      className="bg-red-600 hover:bg-red-700 text-white px-3 h-8 text-sm rounded shadow flex items-center"
    >
      🧾 Export as PDF
    </button>
  );
};

export default PDFExportButton;
