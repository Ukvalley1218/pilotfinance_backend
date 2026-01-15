import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import fs from "fs";
import helmet from "helmet";
import morgan from "morgan";
import { fileURLToPath } from "url";

// --- DATABASE CONNECTION ---
import connectDB from "./db.js";

// --- IMPORT ADMIN ROUTES ---
import adminAuthRoutes from "./src/routes/admin/authRoutes.js";
import studentRoutes from "./src/routes/admin/studentRoutes.js";
import partnerRoutes from "./src/routes/admin/partnerRoutes.js";
import adminLoanRoutes from "./src/routes/admin/loanRoutes.js";
import fundRoutes from "./src/routes/admin/fundRoutes.js";
import reportRoutes from "./src/routes/admin/reportRoutes.js";
import adminDocRoutes from "./src/routes/admin/documentRoutes.js";
import financeRoutes from "./src/routes/admin/financeRoutes.js";
import adminNotificationRoutes from "./src/routes/admin/notificationRoutes.js";

// --- IMPORT USER ROUTES ---
import userAuthRoutes from "./src/routes/user/authRoutes.js";
import userKycRoutes from "./src/routes/user/kycRoutes.js";
import userDashboardRoutes from "./src/routes/user/dashboardRoutes.js";
import userLoanRoutes from "./src/routes/user/loanRoutes.js";
import userSignatureRoutes from "./src/routes/user/documentRoutes.js";

// --- NEW: IMPORT RECRUITMENT ROUTES ---
import recruitmentAuthRoutes from "./src/routes/recruitment/authRoutes.js";

dotenv.config();

// Initialize DB
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- FIXED: AUTOMATIC DIRECTORY SETUP ---
const rootDir = process.cwd();
const uploadDirs = [
  path.join(rootDir, "uploads"),
  path.join(rootDir, "uploads/documents"),
  path.join(rootDir, "uploads/avatars"),
  path.join(rootDir, "uploads/signatures"),
  path.join(rootDir, "uploads/kyc"),
  path.join(rootDir, "uploads/partners"), // New folder for recruitment partner documents
];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Directory verified/created: ${dir}`);
  }
});

// --- MIDDLEWARE ---
app.use(helmet({ crossOriginResourcePolicy: false }));

// --- DYNAMIC CORS CONFIGURATION ---
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173", // User Panel
  "http://localhost:5174", // Admin Panel
  "http://localhost:5175", // Assuming Recruitment Panel might be on this port
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(morgan("dev"));

// --- FIXED: STATIC ASSETS ---
app.use("/uploads", express.static(path.join(rootDir, "uploads")));

// --- 🚀 ADMIN PANEL ROUTES ---
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/student", studentRoutes);
app.use("/api/admin/partner", partnerRoutes);
app.use("/api/admin/loan", adminLoanRoutes);
app.use("/api/admin/funds", fundRoutes);
app.use("/api/admin/reports", reportRoutes);
app.use("/api/admin/document", adminDocRoutes);
app.use("/api/admin/finance", financeRoutes);
app.use("/api/admin/notification", adminNotificationRoutes);

// --- 📱 USER PANEL ROUTES ---
app.use("/api/auth", userAuthRoutes);
app.use("/api/kyc", userKycRoutes);
app.use("/api/dashboard", userDashboardRoutes);
app.use("/api/loans", userLoanRoutes);
app.use("/api/signatures", userSignatureRoutes);

// --- 🤝 RECRUITMENT PANEL ROUTES ---
// This mounts your new recruitment routes
app.use("/api/recruitment/auth", recruitmentAuthRoutes);

app.get("/", (req, res) => res.send("Pilot Finance Unified API Running 🚀"));

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large. Maximum size allowed is 50MB.",
    });
  }
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Unified Server online on port ${PORT}`);
});
