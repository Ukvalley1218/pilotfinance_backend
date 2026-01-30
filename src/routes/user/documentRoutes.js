import express from "express";
import path from "path";

// 1. IMPORT MIDDLEWARE & CONTROLLER
import { protect, adminOnly } from "../../middlewares/authMiddleware.js";
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
  upload.single("document"),
  documentController.uploadDocument,
);

/**
 * @route   DELETE /api/signatures/delete/:docId
 * @desc    Remove a specific document from the user's signature list
 * @access  Private
 * @note    Added to fix the 404 error when clicking Delete in the UI
 */
router.delete("/delete/:docId", protect, documentController.deleteSignature);

/**
 * @route   GET /api/signatures/admin/all
 * @desc    Fetch all digital signatures from all users for the Admin Audit Center
 * @access  Private (Admins Only)
 */
router.get(
  "/admin/all",
  protect,
  adminOnly,
  documentController.getAllSignaturesAdmin,
);

export default router;
