import express from "express";
import {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword, // Make sure to export this from your controller
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Public registration
 */
router.post("/register", registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Public login
 */
router.post("/login", loginUser);

/**
 * @route   GET /api/auth/me OR /api/auth/profile
 * @desc    Get current logged-in user data
 * @access  Private
 */
router.get("/me", protect, getProfile);
router.get("/profile", protect, getProfile);

/**
 * @route   PUT /api/auth/update-profile
 * @desc    Update Name, Email, Contact, and Preferences
 * @access  Private
 */
router.put("/update-profile", protect, updateProfile);
router.put("/profile", protect, updateProfile); // Legacy alias

/**
 * @route   PUT /api/auth/change-password
 * @desc    Update User Password (Requires current password verification)
 * @access  Private
 */
router.put("/change-password", protect, changePassword);

export default router;
