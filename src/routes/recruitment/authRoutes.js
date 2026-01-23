import express from "express";
import multer from "multer";
import path from "path";
import * as recruitmentController from "../../controllers/recruitment/authController.js";
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// --- 1. MULTER CONFIGURATIONS ---

// A. General Partner Documents (KYC)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/partners");
  },
  filename: (req, file, cb) => {
    cb(null, `PRT-${Date.now()}-${file.originalname}`);
  },
});

// B. Profile Avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/avatars");
  },
  filename: (req, file, cb) => {
    cb(null, `AVATAR-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const isMatch = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  if (isMatch) return cb(null, true);
  cb(new Error("Only images (jpeg, jpg, png) and PDFs are allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ---------- RECRUITMENT AUTH ROUTES (Public) ----------
router.post("/register", recruitmentController.registerPartner);
router.post("/login", recruitmentController.login);

// ---------- RECRUITMENT PRIVATE ROUTES (Requires Token) ----------

// 1. Profile & Account Management
router.get("/me", protect, recruitmentController.getMe);

router.put(
  "/update-me",
  protect,
  uploadAvatar.single("avatar"),
  recruitmentController.updateMe,
);

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
  recruitmentController.updatePartnerProfile,
);

// 2. Dashboard, Stats & Activity
router.get(
  "/dashboard-stats",
  protect,
  recruitmentController.getDashboardStats,
);
router.get("/activity", protect, recruitmentController.getActivityLog);

// 3. Legal & Agreements
router.get("/agreement", protect, recruitmentController.getAgreementDetails);
router.post("/agreement/sign", protect, recruitmentController.signAgreement);

// --- ADMIN DATA ROUTE ---
router.get("/partners", protect, recruitmentController.getAllPartners);

// 4. Student Management & LOAN LEDGER SYNC
// This is the core logic for the "Selection" system
router.get(
  "/available-students",
  protect,
  recruitmentController.getAvailableStudents,
);

router.post("/link-user", protect, recruitmentController.linkStudentToPartner);

// Fetch students currently linked to this partner
router.get("/my-students", protect, recruitmentController.getReferredStudents);

// THE FINAL FIX: Fetch loan ledger filtered for this partner
// Frontend should now hit: /api/recruitment/loans
router.get("/loans", protect, recruitmentController.getPartnerLoans);

// Legacy/Internal student addition
// router.post("/add-student", protect, recruitmentController.addStudent);

// 5. Wallet & Transactions
router.get("/wallet", protect, recruitmentController.getWalletData);

export default router;
