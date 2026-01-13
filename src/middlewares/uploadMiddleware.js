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
    // Determine folder based on the route or fieldname
    // KYC goes to uploads/kyc, Admin docs go to uploads/documents
    let uploadPath = "uploads/documents/";

    if (file.fieldname === "kyc" || req.baseUrl.includes("user")) {
      uploadPath = "uploads/kyc/";
    }

    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Standardized filename: timestamp-originalName
    // If user is logged in, we prefix their ID for easy tracking
    const userId = req.user ? `${req.user._id}-` : "";
    const uniqueName = `${userId}${Date.now()}-${file.originalname.replace(
      /\s+/g,
      "_"
    )}`;
    cb(null, uniqueName);
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});
