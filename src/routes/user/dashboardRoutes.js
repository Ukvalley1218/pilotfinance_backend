import express from "express";
import {
  getDashboardData,
  getNotifications,
} from "../../controllers/user/dashboardController.js";
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   GET /api/dashboard
 * @desc    Get user loan stats and list
 * @access  Private
 */
router.get("/", protect, getDashboardData);

/**
 * @route   GET /api/dashboard/notifications
 * @desc    Get user professional notifications
 * @access  Private
 * @url     http://localhost:5000/api/dashboard/notifications
 */
router.get("/notifications", protect, getNotifications);

export default router;
