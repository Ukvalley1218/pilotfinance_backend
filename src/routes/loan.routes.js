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

// Base route is already /api/loan in your server.js
// Using "/" and "/:id" makes the endpoints cleaner

router.post("/", protect, createLoan); // POST /api/loan
router.get("/", protect, getAllLoans); // GET /api/loan
router.get("/:id", protect, getLoanById); // GET /api/loan/:id
router.put("/:id", protect, updateLoan); // PUT /api/loan/:id
router.delete("/:id", protect, deleteLoan); // DELETE /api/loan/:id

// Alias for frontend compatibility if  React code uses "/loans"
router.get("/all", protect, getAllLoans);

export default router;
