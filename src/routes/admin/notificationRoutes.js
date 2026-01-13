import express from "express";
import {
  getNotifications,
  markAsRead,
} from "../../controllers/admin/notificationController.js";
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   GET /api/notifications
 * @desc    Fetch latest notifications for the Admin Dashboard
 * @access  Private
 */
router.get("/", protect, getNotifications);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all unread notifications as read
 * @access  Private
 */
router.put("/read-all", protect, markAsRead);

export default router;
