import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "jspdf-autotable";

export const exportInferenceToPDF = async ({ model, result }) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("InferStream Prediction Report", 14, 20);

  doc.setFontSize(12);
  doc.text(`Model: ${model}`, 14, 30);
  doc.text(`Timestamp: ${new Date().toLocaleString()}`, 14, 38);

  if (result) {
    doc.text("Prediction Result:", 14, 50);
    doc.text(`Prediction: ${result.prediction}`, 20, 58);
    if (result.confidence !== undefined) {
      doc.text(`Confidence: ${result.confidence}`, 20, 66);
    }
  }

  // 🖼️ Snapshot of Chart
  const chartEl = document.getElementById("feature-chart");
  if (chartEl) {
    const canvas = await html2canvas(chartEl);
    const imgData = canvas.toDataURL("image/png");
    doc.addPage();
    doc.setFontSize(16);
    doc.text("📊 Feature Freshness Chart", 14, 20);
    doc.addImage(imgData, "PNG", 10, 30, 180, 100);
  }

  doc.save("inference_report.pdf");
};
