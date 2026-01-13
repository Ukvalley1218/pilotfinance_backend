import express from "express";
import {
  getLedger,
  getBalance,
  withdrawFunds,
} from "../../controllers/admin/financeController.js";
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   GET /api/finance/ledger
 * @desc    Get full list of Credit/Debit transactions
 * @access  Private (Admin only)
 */
router.get("/ledger", protect, getLedger);

/**
 * @route   GET /api/finance/balance
 * @desc    Get real-time calculated wallet balance
 * @access  Private (Admin only)
 */
router.get("/balance", protect, getBalance);

/**
 * @route   POST /api/finance/withdraw
 * @desc    Record a bank withdrawal (Debit)
 * @access  Private (Admin only)
 */
router.post("/withdraw", protect, withdrawFunds);

export default router;
