import express from "express";
import multer from "multer";
import path from "path";
// FIXED: Using named imports to prevent 'undefined' handler errors
import {
  registerPartner,
  login,
  getMe,
  updateMe,
  updatePartnerProfile,
  getDashboardStats,
  getActivityLog,
  getAgreementDetails,
  signAgreement,
  getAllPartners,
  getAvailableStudents,
  linkStudentToPartner,
  getReferredStudents,
  verifyStudent,
  getStudentSignaturesForPartner,
  getPartnerLoans,
  fundStudentLoan,
  getWalletData,
} from "../../controllers/recruitment/authController.js";
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// --- 1. MULTER CONFIGURATIONS ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/partners");
  },
  filename: (req, file, cb) => {
    cb(null, `PRT-${Date.now()}-${file.originalname}`);
  },
});

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
router.post("/register", registerPartner);
router.post("/login", login);

// ---------- RECRUITMENT PRIVATE ROUTES (Requires Token) ----------

// 1. Profile & Account Management
router.get("/me", protect, getMe);
router.put("/update-me", protect, uploadAvatar.single("avatar"), updateMe);

router.put(
  "/update-profile",
  protect,
  upload.fields([
    { name: "regCert", maxCount: 1 },
    { name: "gstCert", maxCount: 1 },
    { name: "idProof", maxCount: 1 },
    { name: "mou", maxCount: 1 },
  ]),
  updatePartnerProfile,
);

// 2. Dashboard, Stats & Activity
router.get("/dashboard-stats", protect, getDashboardStats);
router.get("/activity", protect, getActivityLog);

// 3. Legal & Agreements
router.get("/agreement", protect, getAgreementDetails);
router.post("/agreement/sign", protect, signAgreement);

// --- ADMIN DATA ROUTE ---
router.get("/partners", protect, getAllPartners);

// 4. Student Management
router.get("/available-students", protect, getAvailableStudents);
router.post("/link-user", protect, linkStudentToPartner);
router.get("/my-students", protect, getReferredStudents);
router.put("/verify-student/:studentId", protect, verifyStudent);
router.get(
  "/student-signatures/:studentId",
  protect,
  getStudentSignaturesForPartner,
);

// 5. Loan Ledger & Funding
router.get("/loans", protect, getPartnerLoans);
router.post("/fund-loan", protect, fundStudentLoan);

// 6. Wallet & Transactions
router.get("/wallet", protect, getWalletData);

export default router;
