import express from "express";
import {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
} from "../../controllers/admin/authController.js";
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   POST /api/admin/auth/register
 * @desc    Admin/Staff registration
 * @access  Public (Can be restricted to specific IPs or Admin-only in production)
 */
router.post("/register", registerUser);

/**
 * @route   POST /api/admin/auth/login
 * @desc    Admin login
 * @access  Public
 */
router.post("/login", loginUser);

/**
 * @route   GET /api/admin/auth/me
 * @desc    Get current logged-in admin data
 * @access  Private
 */
router.get("/me", protect, getProfile);

/**
 * @route   GET /api/admin/auth/profile
 * @desc    Get current logged-in admin profile (Alias)
 * @access  Private
 */
router.get("/profile", protect, getProfile);

/**
 * @route   PUT /api/admin/auth/update-profile
 * @desc    Update Name, Email, Contact, and Preferences
 * @access  Private
 */
router.put("/update-profile", protect, updateProfile);

/**
 * @route   PUT /api/admin/auth/profile
 * @desc    Update Profile (Legacy alias for frontend compatibility)
 * @access  Private
 */
router.put("/profile", protect, updateProfile);

/**
 * @route   PUT /api/admin/auth/change-password
 * @desc    Update Admin Password (Requires verification)
 * @access  Private
 */
router.put("/change-password", protect, changePassword);

export default router;
