import express from "express";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../../services/cloudinary.service.js";
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
  addStudentByPartner,
  deleteStudentByPartner,
 
  getLoanWithStudentById,
} from "../../controllers/recruitment/authController.js";
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    let folder = "partners";

    if (file.fieldname === "avatar") folder = "avatars";
    if (["regCert", "gstCert", "idProof", "mou"].includes(file.fieldname)) {
      folder = "partner-kyc";
    }

    return {
      folder: `pilotfinance/${folder}`,
      resource_type: "auto",
      public_id: `${file.fieldname}-${Date.now()}`,
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
  ];
  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only JPG, PNG, and PDF allowed"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});


// ---------- RECRUITMENT AUTH ROUTES (Public) ----------
router.post("/register", registerPartner);
router.post("/login", login);

// ---------- RECRUITMENT PRIVATE ROUTES (Requires Token) ----------

// 1. Profile & Account Management
router.get("/me", protect, getMe);
router.put("/update-me", protect, upload.single("avatar"), updateMe);


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

// using loan id you can get student detials that own that loan

// 4. Student Management
router.get("/available-students", protect, getAvailableStudents);
router.post("/link-user", protect, linkStudentToPartner);
router.post("/add-user", protect, addStudentByPartner);
router.get("/my-students", protect, getReferredStudents);
router.put("/verify-student/:studentId", protect, verifyStudent);
router.get(
  "/student-signatures/:studentId",
  protect,
  getStudentSignaturesForPartner,
);
router.delete("/delete-user/:studentId",protect,deleteStudentByPartner)

// 5. Loan Ledger & Funding
router.get("/loans", protect, getPartnerLoans);
router.post("/fund-loan", protect, fundStudentLoan);

// 6. Wallet & Transactions
router.get("/wallet", protect, getWalletData);

router.get("/:id", protect, getLoanWithStudentById);
export default router;
