import express from "express";
import multer from "multer";
import path from "path";
import * as recruitmentController from "../../controllers/recruitment/authController.js";
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// --- 1. MULTER STORAGE CONFIGURATION ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/partners");
  },
  filename: (req, file, cb) => {
    cb(null, `PRT-${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const isMatch = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  if (isMatch) return cb(null, true);
  cb(new Error("Only images (jpeg, jpg, png) and PDFs are allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit per file
});

// ---------- RECRUITMENT AUTH ROUTES (Public) ----------
router.post("/register", recruitmentController.registerPartner);
router.post("/login", recruitmentController.login);

// ---------- RECRUITMENT DASHBOARD & PROFILE (Private) ----------

// Get current partner profile
router.get("/me", protect, recruitmentController.getMe);

// Added: Get dynamic dashboard stats (Total Commission, Active Students, etc.)
router.get(
  "/dashboard-stats",
  protect,
  recruitmentController.getDashboardStats
);

// Update profile handles the 3-step Registration profile data with files
router.put(
  "/update-profile",
  protect,
  upload.fields([
    { name: "regCert", maxCount: 1 },
    { name: "gstCert", maxCount: 1 },
    { name: "idProof", maxCount: 1 },
    { name: "mou", maxCount: 1 },
    { name: "regions", maxCount: 1 },
    { name: "intake", maxCount: 1 },
    { name: "destinations", maxCount: 1 },
    { name: "categories", maxCount: 1 },
  ]),
  recruitmentController.updatePartnerProfile
);

export default router;
