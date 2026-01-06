import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  getAllDocuments,
  uploadDocument,
  updateDocument,
  deleteDocument,
} from "../controllers/document.controller.js";
import { protect } from "../middleware/auth.middleware.js";

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
    // Unique filename with timestamp
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB Limit
});

// --- ROUTES ---

// GET /api/document/all
router.get("/all", protect, getAllDocuments);

// POST /api/document/upload
router.post("/upload", protect, upload.single("file"), uploadDocument);

// PUT /api/document/update/:id
router.put("/update/:id", protect, upload.single("file"), updateDocument);

// DELETE /api/document/delete/:id
router.delete("/delete/:id", protect, deleteDocument);

export default router;
