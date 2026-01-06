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
 * All routes are prefixed with /api/loan in server.js
 */

// --- GET ROUTES ---
router.get("/", protect, getAllLoans);
// Matches API.get("/loan/loans") from Dashboard and LoanApplications
router.get("/loans", protect, getAllLoans);
router.get("/all", protect, getAllLoans);

// --- POST ROUTES ---
router.post("/", protect, createLoan);
// FIX: Matches API.post("/loan/loans") when clicking "New Application"
router.post("/loans", protect, createLoan);

// --- ID BASED ROUTES ---

// Matches API.get("/loan/:id")
router.get("/:id", protect, getLoanById);
// Matches API.get("/loan/loans/:id") - Professional alias
router.get("/loans/:id", protect, getLoanById);

// Matches API.put("/loan/:id")
router.put("/:id", protect, updateLoan);
// FIX: Matches API.put("/loan/loans/:id") when clicking "Save Changes" in Edit Modal
router.put("/loans/:id", protect, updateLoan);

// DELETE
router.delete("/:id", protect, deleteLoan);
router.delete("/loans/:id", protect, deleteLoan);

export default router;
