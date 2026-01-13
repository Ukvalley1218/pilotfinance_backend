import express from "express";
import {
  submitLoanRequest,
  getUserLoans,
} from "../../controllers/user/loanController.js";
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @route   POST /api/loans/request
 * @desc    Submit a new loan application
 * @access  Private (Authenticated users only)
 */
router.post("/request", protect, submitLoanRequest);

/**
 * @route   GET /api/loans/my-loans
 * @desc    Fetch loan history for the logged-in user
 * @access  Private (Authenticated users only)
 */
router.get("/my-loans", protect, getUserLoans);

export default router;
