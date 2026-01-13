import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  getAllDocuments,
  uploadDocument,
  updateDocument,
  deleteDocument,
} from "../../controllers/admin/documentController.js";
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// Configure storage logic
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/documents/";
    // Double check directory exists to prevent 500 error
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Unique filename with timestamp to prevent overwriting
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB Limit for Admin uploads
});

// --- ROUTES ---

/**
 * @route   GET /api/document/all
 * @desc    Fetch all documents uploaded by admins (Templates, Manuals, etc.)
 * @access  Private
 */
router.get("/all", protect, getAllDocuments);

/**
 * @route   POST /api/document/upload
 * @desc    Upload a new document to the admin library
 * @access  Private
 */
router.post("/upload", protect, upload.single("file"), uploadDocument);

/**
 * @route   PUT /api/document/update/:id
 * @desc    Update/Replace an existing document file or metadata
 * @access  Private
 */
router.put("/update/:id", protect, upload.single("file"), updateDocument);

/**
 * @route   DELETE /api/document/delete/:id
 * @desc    Remove a document from the server and database
 * @access  Private
 */
router.delete("/delete/:id", protect, deleteDocument);

export default router;
