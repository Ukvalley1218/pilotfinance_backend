import express from "express";
import {
  getAllFunds,
  addFund,
} from "../../controllers/admin/fundController.js";
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   GET /api/fund/all
 * @desc    Fetch all available funds for capital management
 * @access  Private (Admin only)
 */
router.get("/all", protect, getAllFunds);

/**
 * @route   POST /api/fund/add
 * @desc    Add a new fund source and update the global ledger
 * @access  Private (Admin only)
 */
router.post("/add", protect, addFund);

export default router;
