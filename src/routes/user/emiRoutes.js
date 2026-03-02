import express from "express";
import {
  toggleAutoDebit,
  getAutoDebitStatus,
} from "../../controllers/user/emiController.js";
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   GET /api/emi/auto-debit-status
 * @desc    Get auto-debit status for all loans
 * @access  Private (Student)
 */
router.get("/auto-debit-status", protect, getAutoDebitStatus);

/**
 * @route   POST /api/emi/toggle-autodebit/:loanId
 * @desc    Toggle auto-debit for a loan
 * @access  Private (Student)
 */
router.post("/toggle-autodebit/:loanId", protect, toggleAutoDebit);

export default router;