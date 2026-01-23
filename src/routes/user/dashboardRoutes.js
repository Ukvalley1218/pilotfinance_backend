import express from "express";
import {
  getDashboardData,
  getNotifications,
} from "../../controllers/user/dashboardController.js";
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   GET /api/dashboard/
 * @desc    Get unified student dashboard stats (Total Amount, Progress, Active Portfolio)
 * @access  Private (Requires Student Token)
 */
router.get("/", protect, getDashboardData);

/**
 * @route   GET /api/dashboard/notifications
 * @desc    Get dynamic application status alerts and KYC verification updates
 * @access  Private (Requires Student Token)
 * @url     http://localhost:5000/api/dashboard/notifications
 */
router.get("/notifications", protect, getNotifications);

export default router;
