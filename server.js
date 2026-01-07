import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Import the Routes
import authRoutes from "./src/routes/auth.routes.js";
import studentRoutes from "./src/routes/student.routes.js";
import partnerRoutes from "./src/routes/partner.routes.js";
import loanRoutes from "./src/routes/loan.routes.js";
import fundRoutes from "./src/routes/fund.routes.js";
import reportRoutes from "./src/routes/report.routes.js";
import documentRoutes from "./src/routes/document.routes.js";
import financeRoutes from "./src/routes/finance.routes.js";
import notificationRoutes from "./src/routes/notification.routes.js"; // NEW IMPORT

dotenv.config();

// Configuration for ES Modules __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- AUTOMATIC FOLDER CREATION ---
const uploadDir = path.join(__dirname, "uploads/documents");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("✅ Uploads directory created");
}

// Middleware
app.use(cors());
app.use(express.json());

// --- STATIC FILES ---
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/partner", partnerRoutes);
app.use("/api/loan", loanRoutes);
app.use("/api/funds", fundRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/document", documentRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/notification", notificationRoutes); // NEW ROUTE REGISTERED

app.get("/", (req, res) => {
  res.send("Piolet Finance API Running 🚀");
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err.stack);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: err.message,
  });
});

// Server Initialization
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(
    `📁 Static files served from: ${path.join(__dirname, "uploads")}`
  );
});
