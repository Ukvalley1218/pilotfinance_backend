import multer from "multer";
import path from "path";
import fs from "fs";

// Helper function to ensure upload directories exist
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Default path
    let uploadPath = "uploads/documents/";

    // LOGIC FIX: Check for both 'user' routes AND 'signatures' routes
    // This ensures files from Digital Signature page go to the KYC folder as expected by your DB
    if (
      file.fieldname === "kyc" ||
      req.baseUrl.includes("user") ||
      req.baseUrl.includes("kyc") ||
      req.baseUrl.includes("signatures")
    ) {
      uploadPath = "uploads/kyc/";
    }

    // Optional: Handle avatars specifically if needed
    if (file.fieldname === "avatar" || req.baseUrl.includes("profile")) {
      uploadPath = "uploads/avatars/";
    }

    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate a clean, unique name
    const prefix = file.fieldname === "document" ? "SIG-" : ""; // Identify signatures easily
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);

    // We clean the filename to remove spaces/special characters
    cb(null, `${prefix}${uniqueSuffix}${extension}`);
  },
});

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
      new Error("Invalid file type. Only PDF, JPG, PNG, and DOC are allowed."),
      false
    );
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // Increased to 50MB to match your server.js limit
});
