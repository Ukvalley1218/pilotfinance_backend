import express from "express";
import * as kycController from "../../controllers/user/kycController.js";
import { upload } from "../../middlewares/uploadMiddleware.js"; // Standardized to your multer file name
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// --- 1. GET KYC DATA ---
/**
 * @route   GET /api/kyc/status
 */
router.get("/status", protect, kycController.getKycStatus);

// --- 2. PERSONAL INFO (Step 1) ---
/**
 * @route   POST /api/kyc/personal-info
 */
router.post("/personal-info", protect, kycController.updatePersonalInfo);

// --- 3. DOCUMENT UPLOADS (Step 2) ---
/**
 * @route   POST /api/kyc/upload-docs
 * @desc    Handles multi-field identification uploads
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
    { name: "selfie", maxCount: 1 },
  ]),
  kycController.submitKycDocuments,
);

// --- 4. ADDRESS PROOF (Step 3) ---
/**
 * @route   POST /api/kyc/address-proof
 */
router.post(
  "/address-proof",
  protect,
  upload.single("addressProof"), // Matches 'addressProof' check in multer destination logic
  kycController.submitAddressProof,
);

export default router;
