import express from "express";
import {
  createLoan,
  updateLoan,
  getAllLoans,
  getLoanById,
  deleteLoan,
} from "../controllers/loan.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @route   GET /api/loan OR /api/loan/loans
 * @desc    Get all loans (Handles frontend Dashboard fetch)
 * @access  Private
 */
router.get("/", protect, getAllLoans);
router.get("/loans", protect, getAllLoans); // Fixes 500 error for Dashboard fetch

/**
 * @route   POST /api/loan
 * @desc    Create a new loan
 * @access  Private
 */
router.post("/", protect, createLoan);

/**
 * @route   GET /api/loan/:id
 * @desc    Get single loan by ID
 * @access  Private
 */
router.get("/:id", protect, getLoanById);

/**
 * @route   PUT /api/loan/:id
 * @desc    Update loan by ID
 * @access  Private
 */
router.put("/:id", protect, updateLoan);

/**
 * @route   DELETE /api/loan/:id
 * @desc    Delete loan by ID
 * @access  Private
 */
router.delete("/:id", protect, deleteLoan);

// Alias for frontend compatibility
router.get("/all", protect, getAllLoans);

export default router;
