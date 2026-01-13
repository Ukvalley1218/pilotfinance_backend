import express from "express";
import {
  createLoan,
  updateLoan,
  getAllLoans,
  getLoanById,
  deleteLoan,
} from "../../controllers/admin/loanController.js";
import { protect } from "../../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * All routes are prefixed with /api/loan in server.js
 */

// --- GET ROUTES ---

// Handles GET /api/loan
router.get("/", protect, getAllLoans);

// Matches API.get("/loan/loans") from Dashboard and LoanApplications table
router.get("/loans", protect, getAllLoans);

// Matches GET /api/loan/all
router.get("/all", protect, getAllLoans);

// --- POST ROUTES ---

// Handles POST /api/loan
router.post("/", protect, createLoan);

// FIX: Matches API.post("/loan/loans") when clicking "New Application" in Admin Panel
router.post("/loans", protect, createLoan);

// --- ID BASED ROUTES ---

// Matches API.get("/loan/:id")
router.get("/:id", protect, getLoanById);

// Matches API.get("/loan/loans/:id") - Professional alias used in details pages
router.get("/loans/:id", protect, getLoanById);

// Matches API.put("/loan/:id")
router.put("/:id", protect, updateLoan);

// FIX: Matches API.put("/loan/loans/:id") when clicking "Save Changes" in Edit Modal
router.put("/loans/:id", protect, updateLoan);

// --- DELETE ROUTES ---

// Handles DELETE /api/loan/:id
router.delete("/:id", protect, deleteLoan);

// Handles DELETE /api/loan/loans/:id
router.delete("/loans/:id", protect, deleteLoan);

export default router;
