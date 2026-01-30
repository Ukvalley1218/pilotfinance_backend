import express from "express";
import {
  submitLoanRequest,
  getUserLoans,
  getLoanById, // Added
  repayLoan, // Added
} from "../../controllers/user/loanController.js";
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   POST /api/loans/request
 * @desc    Submit a new loan application
 * @access  Private
 */
router.post("/request", protect, submitLoanRequest);

/**
 * @route   GET /api/loans/my-loans
 * @desc    Fetch loan history for the logged-in user
 */
router.get("/my-loans", protect, getUserLoans);

/**
 * --- NEW REPAYMENT ROUTES ---
 */

/**
 * @route   GET /api/loans/:id
 * @desc    Get specific loan details for the repayment page
 */
router.get("/:id", protect, getLoanById);

/**
 * @route   POST /api/loans/repay
 * @desc    Subtract payoff amount from loan balance
 */
router.post("/repay", protect, repayLoan);

export default router;
