import express from "express";
import multer from "multer";
import path from "path";

// 1. Import Controllers (Using ES Module imports)
import * as authController from "../../controllers/user/authController.js";
import * as userController from "../../controllers/user/userController.js";

// 2. Import Middleware
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// --- MULTER CONFIGURATION FOR AVATARS ---
const storage = multer.diskStorage({
  destination: "./uploads/avatars",
  filename: (req, file, cb) => {
    // Saves file as: userID-timestamp.extension
    // req.user.id is available thanks to the 'protect' middleware
    cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2000000 }, // 2MB Max
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    if (extname) return cb(null, true);
    cb(new Error("Only images (jpeg, jpg, png) are allowed"));
  },
});

// DEBUG LOGS (Updated for ES Modules check)
console.log("------------------------------------------");
console.log("User Auth Controller Loaded:", !!authController);
console.log("User Profile Controller Loaded:", !!userController);
console.log("Auth Middleware Loaded:", !!protect);
console.log("------------------------------------------");

// ---------- AUTH ROUTES (Public) ----------
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/send-otp", authController.sendOTP);
router.post("/verify-otp", authController.verifyOTP);
router.post("/google-login", authController.googleLogin);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// ---------- USER PROFILE ROUTES (Private) ----------
// We use 'protect' as our middleware across the unified backend
router.get("/me", protect, authController.getMe);
router.get("/profile", protect, userController.getProfile);
router.put("/profile", protect, userController.updateProfile);

// Update Profile Picture Route
// Path: PUT /api/auth/profile/avatar
router.put(
  "/profile/avatar",
  protect,
  upload.single("avatar"),
  authController.updateAvatar
);

export default router;
