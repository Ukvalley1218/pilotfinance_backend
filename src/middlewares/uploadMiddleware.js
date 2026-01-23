import multer from "multer";
import path from "path";
import fs from "fs";

// FIX: Standardize root pathing for production environments
// This ensures we are always relative to the project execution root
const rootDir = path.resolve(process.cwd());

/**
 * Ensures a directory exists, creating it recursively if necessary.
 */
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Default fallback folder
    let folder = "documents";

    // 1. Logic for folder categorization based on fieldname
    const kycFields = [
      "front",
      "back",
      "loa",
      "passbook",
      "idFront",
      "idBack",
      "addressProof",
      "selfie",
    ];

    if (kycFields.includes(file.fieldname)) {
      folder = "kyc";
    } else if (file.fieldname === "avatar") {
      folder = "avatars";
    } else if (
      file.fieldname === "document" ||
      file.fieldname === "signature"
    ) {
      folder = "signatures";
    }
    // 2. Secondary logic: detect based on URL path if fieldname is generic
    else if (req.originalUrl.includes("signatures")) {
      folder = "signatures";
    } else if (req.originalUrl.includes("kyc")) {
      folder = "kyc";
    } else if (
      req.originalUrl.includes("auth") ||
      req.originalUrl.includes("profile")
    ) {
      folder = "avatars";
    }

    // Use path.join for cross-platform compatibility (Windows uses \, Linux uses /)
    const uploadPath = path.join(rootDir, "uploads", folder);

    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Determine a clean prefix based on the destination or fieldname
    let prefix = file.fieldname.toUpperCase();

    // Standardize signature prefixes
    if (
      file.fieldname === "document" ||
      file.fieldname === "signature" ||
      req.originalUrl.includes("signatures")
    ) {
      prefix = "SIG";
    }

    // Unique suffix with high entropy to prevent filename collisions
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

    // Extract and sanitize extension
    const extension = path.extname(file.originalname).toLowerCase();

    // Final result: e.g., SIG-1700000000000-123456789.png
    cb(null, `${prefix}-${uniqueSuffix}${extension}`);
  },
});

/**
 * Filters files to ensure only allowed types are uploaded.
 * Production Safety: Prevents malicious scripts from being uploaded.
 */
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF, JPG, PNG, and Word docs are allowed.",
      ),
      false,
    );
  }
};

// --- EXPORTS ---

// Standard upload for single files (Signatures, Avatars, etc.)
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB Limit to accommodate high-res scans
  },
});

// Specific upload configuration for KYC forms with multiple file inputs
export const uploadKyc = upload.fields([
  { name: "front", maxCount: 1 },
  { name: "back", maxCount: 1 },
  { name: "loa", maxCount: 1 },
  { name: "passbook", maxCount: 1 },
  { name: "idFront", maxCount: 1 },
  { name: "idBack", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
  { name: "addressProof", maxCount: 1 },
]);
