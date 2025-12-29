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

router.post("/loans", protect, createLoan);
router.put("/loans/:id", protect, updateLoan);
router.get("/loans", protect, getAllLoans);
router.get("/loans/:id", protect, getLoanById);
router.delete("/loans/:id", protect, deleteLoan);

export default router;
