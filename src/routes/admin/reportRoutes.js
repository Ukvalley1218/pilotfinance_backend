import express from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import { getReports } from "../../controllers/admin/reportController.js";
// When you create the controller, you'll import the functions here:
// import { getFullReport, getLoanAnalytics } from "../../controllers/admin/reportController.js";

const router = express.Router();

/**
 * @route   GET /api/reports/all
 * @desc    Fetch aggregated data for Admin Dashboard Charts
 * @access  Private (Admin only)
 */
router.get("/", protect, getReports);

export default router;
