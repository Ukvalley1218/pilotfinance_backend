import express from "express";
import {
  getTourSettings,
  updateTourSettings,
} from "../../controllers/admin/tourController.js";
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   GET /api/admin/tour
 * @desc    Get tour settings
 * @access  Private (Admin)
 */
router.get("/", protect, getTourSettings);

/**
 * @route   PUT /api/admin/tour
 * @desc    Update tour settings (enable/disable in recruitment panel, folder link)
 * @access  Private (Admin)
 */
router.put("/", protect, updateTourSettings);

export default router;