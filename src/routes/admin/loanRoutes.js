import express from "express";
import {
  createLoan,
  updateLoan,
  getAllLoans,
  getLoanById,
  deleteLoan,
} from "../../controllers/admin/loanController.js";
// FIXED: Added import for the settings controller to handle dynamic rates
import {
  getLoanSettings,
  updateLoanSettings,
} from "../../controllers/admin/settingsController.js";
// FIXED: Changed 'admin' to 'adminOnly' to match your authMiddleware.js export
import { protect, adminOnly } from "../../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * All routes are prefixed with /api/loan in server.js
 */

// --- 1. LOAN CONFIGURATION (DYNAMIC RATES) ---

/**
 * @route   GET /api/loan/loan-settings
 * @desc    Fetch dynamic interest rates and limits
 * Matches: API.get("/loan-settings") in Dashboard
 */
router.get("/loan-settings", protect, getLoanSettings);

/**
 * @route   POST /api/loan/update-loan-settings
 * @desc    Admin sets interest rates for categories
 * Matches: API.post("/update-loan-settings") in Dashboard Config Modal
 */
// FIXED: Changed 'admin' middleware to 'adminOnly'
router.post("/update-loan-settings", protect, adminOnly, updateLoanSettings);

// --- 2. GET ROUTES (LOAN RECORDS) ---

// Handles GET /api/loan
router.get("/", protect, getAllLoans);

// Matches API.get("/loan/loans") from Dashboard and LoanApplications table
router.get("/loans", protect, getAllLoans);

// Matches GET /api/loan/all
router.get("/all", protect, getAllLoans);

// --- 3. POST ROUTES (LOAN RECORDS) ---

// Handles POST /api/loan
router.post("/", protect, createLoan);

// FIX: Matches API.post("/loan/loans") when clicking "New Application" in Admin Panel
router.post("/loans", protect, createLoan);

// --- 4. ID BASED ROUTES ---

// Matches API.get("/loan/:id")
router.get("/:id", protect, getLoanById);

// Matches API.get("/loan/loans/:id") - Professional alias used in details pages
router.get("/loans/:id", protect, getLoanById);

// Matches API.put("/loan/:id")
router.put("/:id", protect, updateLoan);

// FIX: Matches API.put("/loan/loans/:id") when clicking "Save Changes" in Edit Modal
router.put("/loans/:id", protect, updateLoan);

// --- 5. DELETE ROUTES ---

// Handles DELETE /api/loan/:id
router.delete("/:id", protect, deleteLoan);

// Handles DELETE /api/loan/loans/:id
router.delete("/loans/:id", protect, deleteLoan);

export default router;
