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

// --- IMPORT RECRUITMENT ROUTES ---
import recruitmentAuthRoutes from "./src/routes/recruitment/authRoutes.js";

dotenv.config();

// Initialize DB
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();

const app = express();

// --- 📁 AUTOMATIC DIRECTORY SETUP ---
const absoluteUploadPath = path.join(rootDir, "uploads");

const uploadDirs = [
  absoluteUploadPath,
  path.join(absoluteUploadPath, "documents"),
  path.join(absoluteUploadPath, "avatars"),
  path.join(absoluteUploadPath, "signatures"),
  path.join(absoluteUploadPath, "kyc"),
  path.join(absoluteUploadPath, "partners"),
];

// Ensure all required folders exist on startup
uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Directory verified/created: ${dir}`);
  }
});

// --- 🖼️ STATIC ASSETS (PRODUCTION FIX FOR 404s) ---
/** * Setting 'Cross-Origin-Resource-Policy' to 'cross-origin' is critical
 * to allow the browser to load images/PDFs when the frontend
 * and backend are on different ports (e.g., 5173 and 5000).
 */
app.use(
  "/uploads",
  express.static(absoluteUploadPath, {
    setHeaders: (res) => {
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
      res.set("Access-Control-Allow-Origin", "*");
    },
  }),
);
console.log("✅ Static files being served from:", absoluteUploadPath);

// --- SECURITY & LOGGING (FIXED FOR CSP VIOLATIONS) ---
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "connect-src": [
          "'self'",
          "http://localhost:5000",
           "https://pilotfinance-backend.onrender.com",
        ],
        "img-src": [
          "'self'",
          "data:",
          "blob:",
          "http://localhost:5000",
           "https://pilotfinance-backend.onrender.com",
          "https://ui-avatars.com",
        ],
        "script-src": ["'self'", "'unsafe-inline'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "font-src": ["'self'", "data:", "https:"],
        "frame-src": ["'self'", "blob:", "data:"], // Required for PDF previews
      },
    },
  }),
);
app.use(morgan("dev"));

// --- 🌐 DYNAMIC CORS CONFIGURATION ---
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "https://pf.valleyhoster.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server, Postman, cron jobs
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Never throw here
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Required for preflight
app.options("*", cors());


// Body Parsers (Increased limit for high-res KYC documents)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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
app.use("/api/recruitment/auth", recruitmentAuthRoutes);

app.get("/", (req, res) => res.send("Pilot Finance Unified API Running 🚀"));

// --- 🛠️ GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large. Maximum size allowed is 50MB.",
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Unified Server online on port ${PORT}`);
});
