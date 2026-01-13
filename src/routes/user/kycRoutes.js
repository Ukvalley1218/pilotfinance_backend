import express from "express";
import * as kycController from "../../controllers/user/kycController.js";
import { upload } from "../../middlewares/uploadMiddleware.js"; // Standardized name
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// --- 1. GET KYC DATA (FIXES REFRESH ISSUE) ---
/**
 * @route   GET /api/kyc/status
 * @desc    Fetch existing KYC data to populate frontend state
 * @access  Private
 */
router.get("/status", protect, kycController.getKycStatus);

// --- 2. PERSONAL INFO (Step 1) ---
/**
 * @route   POST /api/kyc/personal-info
 * @desc    Submit text-based KYC details
 * @access  Private
 */
router.post("/personal-info", protect, kycController.updatePersonalInfo);

// --- 3. DOCUMENT UPLOADS (Step 2) ---
/**
 * @route   POST /api/kyc/upload-docs
 * @desc    Upload multiple identification and legal documents
 * @access  Private
 */
router.post(
  "/upload-docs",
  protect,
  upload.fields([
    { name: "front", maxCount: 1 },
    { name: "back", maxCount: 1 },
    { name: "loa", maxCount: 1 },
    { name: "passbook", maxCount: 1 },
    { name: "idFront", maxCount: 1 },
    { name: "idBack", maxCount: 1 },
    { name: "selfie", maxCount: 1 }, // Matches your Kyc.jsx requirement
  ]),
  kycController.submitKycDocuments
);

// --- 4. ADDRESS PROOF (Step 3) ---
/**
 * @route   POST /api/kyc/address-proof
 * @desc    Submit single document for address verification
 * @access  Private
 */
router.post(
  "/address-proof",
  protect,
  upload.single("addressProof"),
  kycController.submitAddressProof
);

export default router;
