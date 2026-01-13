import express from "express";
import multer from "multer";
import path from "path";

// 1. IMPORT MIDDLEWARE & CONTROLLER
import { protect } from "../../middlewares/authMiddleware.js";
import * as documentController from "../../controllers/user/documentController.js";

const router = express.Router();

// 2. MULTER CONFIGURATION
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: function (req, file, cb) {
    // Saves as: SIG-TIMESTAMP-RANDOM.ext for better organization
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `SIG-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only .pdf, .png, .jpg and .jpeg format allowed!"));
    }
  },
});

// 3. ROUTES

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
  documentController.uploadDocument
);

export default router;
