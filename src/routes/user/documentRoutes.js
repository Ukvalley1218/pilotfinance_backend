import express from "express";
import path from "path";

// 1. IMPORT MIDDLEWARE & CONTROLLER
// Changed import source to authMiddleware and name to adminOnly to match your file
import { protect, adminOnly } from "../../middlewares/authMiddleware.js";
// Using the centralized upload middleware from your multer file
import { upload } from "../../middlewares/uploadMiddleware.js";
import * as documentController from "../../controllers/user/documentController.js";

const router = express.Router();

// --- 2. ROUTES ---

/**
 * @route   GET /api/signatures
 * @desc    Fetch all signed documents for the logged-in user
 * @access  Private
 */
router.get("/", protect, documentController.getUserDocuments);

/**
 * @route   PUT /api/signatures/upload/:docId
 * @desc    Upload or Update a specific document (IDs 1-6)
 * @access  Private
 */
router.put(
  "/upload/:docId",
  protect,
  upload.single("document"), // Using the centralized upload logic
  documentController.uploadDocument,
);

/**
 * @route   GET /api/signatures/admin/all
 * @desc    Fetch all digital signatures from all users for the Admin Audit Center
 * @access  Private (Admins Only)
 * @note    This route fixes the 404 error in the Admin Panel
 */
router.get(
  "/admin/all",
  protect,
  adminOnly, // Updated to match the export in your authMiddleware.js
  documentController.getAllSignaturesAdmin,
);

export default router;
