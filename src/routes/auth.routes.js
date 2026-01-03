import express from "express";
import {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected routes (Require JWT Token)
router.get("/profile", protect, getProfile);
router.get("/me", protect, getProfile); // Added alias for frontend compatibility

// Profile updates
router.put("/profile", protect, updateProfile);
router.put("/update-profile", protect, updateProfile);

export default router;
