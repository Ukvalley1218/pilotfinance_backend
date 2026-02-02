import { generateReportData } from "../../services/reports.service.js";
import { Parser } from "json2csv";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

export const getReports = async (req, res) => {
  try {
    const report = await generateReportData(req.query);

    // EXPORT HANDLING
    if (req.query.export === "csv") {
      const parser = new Parser();
      const csv = parser.parse(report.table);
      res.header("Content-Type", "text/csv");
      res.attachment("report.csv");
      return res.send(csv);
    }

    if (req.query.export === "excel") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Report");
      sheet.columns = Object.keys(report.table[0] || {}).map(k => ({ header: k, key: k }));
      sheet.addRows(report.table);
      res.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.attachment("report.xlsx");
      await workbook.xlsx.write(res);
      return res.end();
    }

    if (req.query.export === "pdf") {
      const doc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      doc.pipe(res);
      doc.text("Loan Report", { align: "center" });
      report.table.forEach(row => doc.text(JSON.stringify(row)));
      doc.end();
      return;
    }

    res.json({ success: true, ...report });
  } catch (err) {
    console.error("Reports Error:", err);
    res.status(500).json({ success: false, message: "Report generation failed" });
  }
};